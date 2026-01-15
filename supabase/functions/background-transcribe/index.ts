import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memo_id, audio_url, language } = await req.json();
    
    if (!memo_id || !audio_url) {
      return new Response(
        JSON.stringify({ error: "Missing memo_id or audio_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to processing
    await supabase
      .from("memos")
      .update({ transcription_status: "processing" })
      .eq("id", memo_id);

    console.log(`Starting background transcription for memo ${memo_id}`);

    let transcriptToProcess = "";
    let detectedLanguage = language || "auto";

    // Download audio from storage
    try {
      const audioResponse = await fetch(audio_url);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }
      
      const audioBlob = await audioResponse.blob();
      console.log(`Downloaded audio: ${audioBlob.size} bytes`);

      // Call ElevenLabs for transcription
      const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
      if (!ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY not configured");
      }

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model_id", "scribe_v1");
      
      if (language && language !== "auto") {
        // Map language codes to ISO 639-3
        const langMap: Record<string, string> = {
          "en-US": "eng",
          "ru-RU": "rus", 
          "uk-UA": "ukr",
          "es-ES": "spa",
          "fr-FR": "fra",
          "de-DE": "deu",
        };
        const isoLang = langMap[language];
        if (isoLang) {
          formData.append("language_code", isoLang);
        }
      }

      console.log("Calling ElevenLabs transcription API...");
      const transcribeResponse = await fetch(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: formData,
        }
      );

      if (!transcribeResponse.ok) {
        const errorText = await transcribeResponse.text();
        console.error("ElevenLabs error:", errorText);
        throw new Error(`ElevenLabs transcription failed: ${transcribeResponse.status}`);
      }

      const transcription = await transcribeResponse.json();
      transcriptToProcess = transcription.text || "";
      console.log(`Transcription complete: ${transcriptToProcess.length} chars`);

      // Detect language from response if available
      if (transcription.language_code) {
        const reverseMap: Record<string, string> = {
          "eng": "en-US",
          "rus": "ru-RU",
          "ukr": "uk-UA", 
          "spa": "es-ES",
          "fra": "fr-FR",
          "deu": "de-DE",
        };
        detectedLanguage = reverseMap[transcription.language_code] || detectedLanguage;
      }
    } catch (transcribeError) {
      console.error("Transcription error:", transcribeError);
      // Mark as failed and exit
      await supabase
        .from("memos")
        .update({ transcription_status: "failed" })
        .eq("id", memo_id);
      
      return new Response(
        JSON.stringify({ error: "Transcription failed", details: String(transcribeError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we have a transcript, process with AI
    if (transcriptToProcess.trim()) {
      try {
        console.log("Processing with AI...");
        const processResponse = await fetch(
          `${supabaseUrl}/functions/v1/process-memo`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ 
              transcript: transcriptToProcess, 
              language: detectedLanguage 
            }),
          }
        );

        if (processResponse.ok) {
          const result = await processResponse.json();
          console.log("AI processing complete:", result.title);

          // Update memo with full results
          await supabase
            .from("memos")
            .update({
              transcript: result.transcript || transcriptToProcess,
              title: result.title || "Voice Memo",
              summary: result.summary || transcriptToProcess.slice(0, 150),
              categories: result.categories || ["Ideas"],
              tasks: result.tasks || [],
              language: result.language || detectedLanguage,
              transcription_status: "completed",
            })
            .eq("id", memo_id);
        } else {
          console.warn("AI processing failed, using raw transcript");
          // Still save the transcript even if AI fails
          await supabase
            .from("memos")
            .update({
              transcript: transcriptToProcess,
              summary: transcriptToProcess.slice(0, 150),
              language: detectedLanguage,
              transcription_status: "completed",
            })
            .eq("id", memo_id);
        }
      } catch (aiError) {
        console.error("AI processing error:", aiError);
        // Save raw transcript anyway
        await supabase
          .from("memos")
          .update({
            transcript: transcriptToProcess,
            summary: transcriptToProcess.slice(0, 150),
            language: detectedLanguage,
            transcription_status: "completed",
          })
          .eq("id", memo_id);
      }
    } else {
      // No transcript - still mark as completed
      await supabase
        .from("memos")
        .update({ transcription_status: "completed" })
        .eq("id", memo_id);
    }

    console.log(`Background transcription completed for memo ${memo_id}`);

    return new Response(
      JSON.stringify({ success: true, memo_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Background transcribe error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
