import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function deleteStoragePrefix(opts: {
  supabase: ReturnType<typeof createClient>;
  bucket: string;
  prefix: string;
}) {
  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await opts.supabase.storage.from(opts.bucket).list(opts.prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      // Supabase storage list returns folder markers + files; recurse on folders.
      // The API doesn't give a direct "isFolder" flag across all environments, so we infer by missing metadata.
      const isLikelyFolder = !("metadata" in item) || item.metadata === null;
      const fullPath = `${opts.prefix}/${item.name}`.replace(/\/+/g, "/");

      if (isLikelyFolder) {
        await deleteStoragePrefix({ supabase: opts.supabase, bucket: opts.bucket, prefix: fullPath });
      } else {
        paths.push(fullPath);
      }
    }

    // list() is paginated by offset; if we saw exactly limit, there may be more.
    if (data.length < 1000) break;
    offset += data.length;
  }

  if (paths.length > 0) {
    const { error } = await opts.supabase.storage.from(opts.bucket).remove(paths);
    if (error) throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing SUPABASE_URL or SUPABASE_ANON_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error:
            "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in your Supabase Edge Function secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Validate caller (user JWT) using anon key
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized - please sign in" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Admin client for destructive operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Best-effort storage cleanup (audio + legacy avatars)
    await Promise.allSettled([
      deleteStoragePrefix({ supabase: supabaseAdmin, bucket: "audio-memos", prefix: userId }),
      deleteStoragePrefix({ supabase: supabaseAdmin, bucket: "avatars", prefix: userId }),
    ]);

    // Database cleanup (order matters for FK constraints).
    // Any failures will bubble with a readable error for the client.
    const ops = [
      supabaseAdmin.from("memo_shares").delete().or(`shared_by.eq.${userId},shared_with_user_id.eq.${userId}`),
      supabaseAdmin.from("group_members").delete().eq("user_id", userId),
      supabaseAdmin.from("groups").delete().eq("created_by", userId),
      supabaseAdmin.from("follows").delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`),
      supabaseAdmin.from("memo_likes").delete().eq("user_id", userId),
      supabaseAdmin.from("bookmarks").delete().eq("user_id", userId),
      supabaseAdmin.from("notifications").delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`),
      supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId),
      supabaseAdmin.from("memos").delete().eq("user_id", userId),
      supabaseAdmin.from("folders").delete().eq("user_id", userId),
      supabaseAdmin.from("profiles").delete().eq("user_id", userId),
    ];

    for (const op of ops) {
      const { error } = await op;
      if (error) throw error;
    }

    const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthErr) throw deleteAuthErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("delete-account error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Delete failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
