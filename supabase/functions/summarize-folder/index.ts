import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { folderName, memos } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!memos || memos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No memos to summarize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build memo context for AI
    const memoContext = memos.map((m: any, i: number) => {
      return `Memo ${i + 1}: "${m.title}"
Summary: ${m.summary || "No summary"}
Nuggets: ${m.nuggets?.length > 0 ? m.nuggets.join(", ") : "None"}
Date: ${m.createdAt}`;
    }).join("\n\n");

    const systemPrompt = `You are an expert at synthesizing information from multiple voice memos. 
Analyze the following memos from the folder "${folderName}" and provide:
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
      console.error("AI gateway error:", response.status, errorText);
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
