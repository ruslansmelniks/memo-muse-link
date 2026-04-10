import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data in order (respecting potential FK references)
    await adminClient.from("push_subscriptions").delete().eq("user_id", userId);
    await adminClient.from("notifications").delete().eq("user_id", userId);
    await adminClient.from("notifications").delete().eq("actor_id", userId);
    await adminClient.from("bookmarks").delete().eq("user_id", userId);
    await adminClient.from("memo_likes").delete().eq("user_id", userId);
    await adminClient.from("memo_shares").delete().eq("shared_by", userId);
    await adminClient.from("memo_shares").delete().eq("shared_with_user_id", userId);
    await adminClient.from("follows").delete().eq("follower_id", userId);
    await adminClient.from("follows").delete().eq("following_id", userId);
    await adminClient.from("group_members").delete().eq("user_id", userId);

    // Delete user's memos (and their audio files)
    const { data: memos } = await adminClient
      .from("memos")
      .select("id, audio_url")
      .eq("user_id", userId);

    if (memos && memos.length > 0) {
      const audioFiles = memos
        .filter((m) => m.audio_url)
        .map((m) => {
          const url = new URL(m.audio_url!);
          const path = url.pathname.split("/object/public/audio-memos/")[1];
          return path;
        })
        .filter(Boolean);

      if (audioFiles.length > 0) {
        await adminClient.storage.from("audio-memos").remove(audioFiles);
      }

      // Delete memos
      await adminClient.from("memos").delete().eq("user_id", userId);
    }

    // Delete folders
    await adminClient.from("folders").delete().eq("user_id", userId);

    // Delete avatar if exists
    const { data: profile } = await adminClient
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .single();

    if (profile?.avatar_url) {
      const url = new URL(profile.avatar_url);
      const path = url.pathname.split("/object/public/avatars/")[1];
      if (path) {
        await adminClient.storage.from("avatars").remove([path]);
      }
    }

    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // Delete groups created by user
    const { data: groups } = await adminClient
      .from("groups")
      .select("id")
      .eq("created_by", userId);

    if (groups && groups.length > 0) {
      for (const group of groups) {
        await adminClient.from("group_members").delete().eq("group_id", group.id);
        await adminClient.from("memo_shares").delete().eq("shared_with_group_id", group.id);
      }
      await adminClient.from("groups").delete().eq("created_by", userId);
    }

    // Finally, delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
