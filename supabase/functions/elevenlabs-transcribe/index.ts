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
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const preferredLanguage = formData.get("language") as string | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    console.log("Processing audio file:", audioFile.name, "Size:", audioFile.size, "Type:", audioFile.type);
    console.log("Preferred language:", preferredLanguage);

    const apiFormData = new FormData();
    apiFormData.append("file", audioFile);
    apiFormData.append("model_id", "scribe_v1");
    apiFormData.append("tag_audio_events", "false");
    apiFormData.append("diarize", "false");
    
    // If a specific language is provided (not auto), use it
    // Otherwise, let ElevenLabs auto-detect
    if (preferredLanguage && preferredLanguage !== "auto") {
      // Convert language code format (e.g., "en-US" -> "eng", "ru-RU" -> "rus")
      const languageMap: Record<string, string> = {
        "en-US": "eng",
        "ru-RU": "rus",
        "uk-UA": "ukr",
        "es-ES": "spa",
        "fr-FR": "fra",
        "de-DE": "deu",
      };
      const isoCode = languageMap[preferredLanguage];
      if (isoCode) {
        apiFormData.append("language_code", isoCode);
      }
    }

    console.log("Calling ElevenLabs API...");
    
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid ElevenLabs API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const transcription = await response.json();
    console.log("Transcription received, text length:", transcription.text?.length);

    // Map ISO 639-3 back to our format
    const reverseLanguageMap: Record<string, string> = {
      "eng": "en-US",
      "rus": "ru-RU",
      "ukr": "uk-UA",
      "spa": "es-ES",
      "fra": "fr-FR",
      "deu": "de-DE",
    };

    // Extract detected language from the response if available
    const detectedLanguageCode = transcription.language_code || transcription.detected_language;
    const detectedLanguage = detectedLanguageCode 
      ? (reverseLanguageMap[detectedLanguageCode] || detectedLanguageCode)
      : preferredLanguage || "en-US";

    return new Response(
      JSON.stringify({
        text: transcription.text || "",
        words: transcription.words || [],
        language: detectedLanguage,
        audio_events: transcription.audio_events || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Transcription failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
