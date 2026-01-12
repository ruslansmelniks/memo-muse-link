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
    const { transcript, language } = await req.json();
    
    if (!transcript || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcript provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isAutoDetect = language === "auto" || !language;
    
const systemPrompt = `You are an AI assistant that processes voice memo transcripts. The transcript may be in any language (commonly English or Russian).

Analyze the transcript and extract:

1. A concise summary (1-2 sentences max) - IN THE SAME LANGUAGE as the transcript
2. Relevant categories from this list: Ideas, Nuggets, Reflections, Goals, Gratitude, Creative
3. Any nuggets (key insights, action items, or valuable takeaways) mentioned - IN THE SAME LANGUAGE as the transcript
4. A suggested title (short, descriptive, 3-6 words) - IN THE SAME LANGUAGE as the transcript
5. The detected language code (e.g., "en-US", "ru-RU", "uk-UA", "es-ES", "fr-FR", "de-DE")

Respond in JSON format only:
{
  "title": "suggested title here",
  "summary": "concise summary here",
  "categories": ["Category1", "Category2"],
  "tasks": ["nugget 1", "nugget 2"],
  "detected_language": "language code here"
}

Be concise and practical. Only include categories that truly fit. Only extract nuggets that are clearly valuable insights or action items mentioned by the speaker.
The title, summary, and nuggets should be in the SAME LANGUAGE as the original transcript.`;

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
          { role: "user", content: `Process this voice memo transcript:\n\n"${transcript}"` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI processing failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response from the AI
    let parsed;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback response
      parsed = {
        title: "Voice Memo",
        summary: transcript.slice(0, 150) + (transcript.length > 150 ? "..." : ""),
        categories: ["Ideas"],
        tasks: [],
        detected_language: language || "en-US",
      };
    }

    // Determine final language
    const finalLanguage = isAutoDetect 
      ? (parsed.detected_language || "en-US")
      : language;

    return new Response(
      JSON.stringify({
        title: parsed.title || "Voice Memo",
        summary: parsed.summary || transcript.slice(0, 150),
        categories: parsed.categories || ["Ideas"],
        tasks: parsed.tasks || [],
        transcript: transcript,
        language: finalLanguage,
        detected_language: parsed.detected_language,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process memo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
