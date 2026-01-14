import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_FOLDER_NAME_LENGTH = 200;
const MAX_MEMOS_COUNT = 100;
const MAX_MEMO_TITLE_LENGTH = 500;
const MAX_MEMO_SUMMARY_LENGTH = 2000;

function sanitizeString(str: string, maxLength: number): string {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLength).replace(/[<>]/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - please sign in" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { folderName, memos } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Validate memos array
    if (!memos || !Array.isArray(memos)) {
      return new Response(
        JSON.stringify({ error: "Invalid memos data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (memos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No memos to summarize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (memos.length > MAX_MEMOS_COUNT) {
      return new Response(
        JSON.stringify({ error: `Too many memos. Maximum ${MAX_MEMOS_COUNT} allowed.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize folder name
    const sanitizedFolderName = sanitizeString(folderName || "Folder", MAX_FOLDER_NAME_LENGTH);

    console.log(`Summarizing folder "${sanitizedFolderName}" with ${memos.length} memos for user ${user.id}`);

    // Build memo context for AI with sanitized inputs
    const memoContext = memos.slice(0, MAX_MEMOS_COUNT).map((m: any, i: number) => {
      const title = sanitizeString(m.title || "Untitled", MAX_MEMO_TITLE_LENGTH);
      const summary = sanitizeString(m.summary || "No summary", MAX_MEMO_SUMMARY_LENGTH);
      const nuggets = Array.isArray(m.nuggets) 
        ? m.nuggets.slice(0, 10).map((n: any) => sanitizeString(String(n), 500)).join(", ")
        : "None";
      const createdAt = sanitizeString(m.createdAt || "Unknown date", 50);
      
      return `Memo ${i + 1}: "${title}"
Summary: ${summary}
Nuggets: ${nuggets}
Date: ${createdAt}`;
    }).join("\n\n");

    const systemPrompt = `You are an expert at synthesizing information from multiple voice memos. 
Analyze the following memos from the folder "${sanitizedFolderName}" and provide:
1. A concise overview (2-3 sentences) of the main themes
2. Key themes or topics (as a list of 3-5 short phrases)
3. All important nuggets/action items combined and deduplicated
4. Any connections or patterns you notice across the memos

Be concise and actionable. Focus on what's most important.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are ${memos.length} memos to analyze:\n\n${memoContext}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "folder_summary",
              description: "Return a structured summary of the folder's memos",
              parameters: {
                type: "object",
                properties: {
                  overview: { 
                    type: "string",
                    description: "2-3 sentence overview of the folder's content"
                  },
                  themes: { 
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key themes or topics"
                  },
                  nuggets: { 
                    type: "array",
                    items: { type: "string" },
                    description: "Combined list of important insights and action items"
                  },
                  connections: { 
                    type: "string",
                    description: "Patterns or connections noticed across memos"
                  },
                },
                required: ["overview", "themes", "nuggets", "connections"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "folder_summary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "folder_summary") {
      throw new Error("Unexpected AI response format");
    }

    const summary = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Summarize folder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
