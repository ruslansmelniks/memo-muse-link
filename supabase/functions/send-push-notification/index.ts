import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
}

// Input validation constants
const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 500;
const MAX_URL_LENGTH = 2000;

function validateInput(payload: PushPayload): { valid: boolean; error?: string } {
  if (!payload.userId || typeof payload.userId !== "string") {
    return { valid: false, error: "Invalid userId" };
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(payload.userId)) {
    return { valid: false, error: "Invalid userId format" };
  }

  if (!payload.title || typeof payload.title !== "string" || payload.title.length > MAX_TITLE_LENGTH) {
    return { valid: false, error: `Title must be a string with max ${MAX_TITLE_LENGTH} characters` };
  }

  if (!payload.body || typeof payload.body !== "string" || payload.body.length > MAX_BODY_LENGTH) {
    return { valid: false, error: `Body must be a string with max ${MAX_BODY_LENGTH} characters` };
  }

  if (payload.url && (typeof payload.url !== "string" || payload.url.length > MAX_URL_LENGTH)) {
    return { valid: false, error: `URL must be a string with max ${MAX_URL_LENGTH} characters` };
  }

  // Validate URL format if provided
  if (payload.url) {
    try {
      // Only allow relative URLs starting with / or valid http/https URLs
      if (!payload.url.startsWith("/") && !payload.url.startsWith("https://") && !payload.url.startsWith("http://")) {
        return { valid: false, error: "Invalid URL format" };
      }
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  return { valid: true };
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
  vapidPrivateKey: string,
  vapidPublicKey: string
) {
  const { endpoint, p256dh, auth } = subscription;

  // Create JWT for VAPID
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: new URL(endpoint).origin,
    exp: now + 12 * 60 * 60,
    sub: "mailto:push@lovable.app",
  };

  // Import the private key for signing
  const privateKeyBuffer = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${claimsB64}`;
  
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Encrypt payload using Web Push protocol
  const payloadString = JSON.stringify(payload);
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
    },
    body: encoder.encode(payloadString),
  });

  if (!response.ok && response.status !== 201) {
    const text = await response.text();
    console.error(`Push failed for endpoint: ${response.status}`);
    
    // If subscription is invalid, return false to indicate it should be removed
    if (response.status === 404 || response.status === 410) {
      return { success: false, expired: true };
    }
    return { success: false, expired: false };
  }

  return { success: true, expired: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = "BBZuOi2FTfMatiUJLJGNtT1taQ6JZfDBTeudGCc91H9r_qSn_054LXqZNs3Uhdb8eqXxdp8dVly65eKhQG05DKA";

    if (!vapidPrivateKey) {
      throw new Error("VAPID_PRIVATE_KEY not configured");
    }

    // SECURITY: Verify this is called by service role (internal trigger) or authenticated user
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Check if this is a service role call (from database trigger)
    const isServiceRoleCall = authHeader?.includes(serviceRoleKey);
    
    // If not service role, verify the caller is authenticated
    if (!isServiceRoleCall && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      ).auth.getUser();
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Regular users cannot send push notifications to others
      return new Response(
        JSON.stringify({ error: "Forbidden - only system can send push notifications" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: PushPayload = await req.json();

    // Validate input
    const validation = validateInput(payload);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, title, body, url } = payload;

    // Get all push subscriptions for this user
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (fetchError) throw fetchError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationPayload = { title, body, url };
    const expiredSubscriptions: string[] = [];
    let successCount = 0;

    // Send to all subscriptions
    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notificationPayload,
        vapidPrivateKey,
        vapidPublicKey
      );

      if (result.success) {
        successCount++;
      } else if (result.expired) {
        expiredSubscriptions.push(sub.id);
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("id", expiredSubscriptions);
    }

    return new Response(
      JSON.stringify({ 
        sent: successCount, 
        total: subscriptions.length,
        cleaned: expiredSubscriptions.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending push notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
