import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB max
const VALID_LANGUAGES = ["auto", "en-US", "ru-RU", "uk-UA", "es-ES", "fr-FR", "de-DE"];
const VALID_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
  "video/webm", // Some browsers report webm as video
];

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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const preferredLanguage = formData.get("language") as string | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const isValidType = VALID_AUDIO_TYPES.some(type => 
      audioFile.type.includes(type.split("/")[1]) || audioFile.type === type
    );
    
    if (!isValidType && audioFile.type) {
      console.log(`Warning: Unexpected audio type: ${audioFile.type}`);
      // Don't reject - let ElevenLabs handle format validation
    }

    // Validate language
    const validLanguage = preferredLanguage && VALID_LANGUAGES.includes(preferredLanguage) 
      ? preferredLanguage 
      : "auto";

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    console.log(`Processing audio for user ${user.id}, size: ${audioFile.size}, type: ${audioFile.type}`);

    const apiFormData = new FormData();
    apiFormData.append("file", audioFile);
    apiFormData.append("model_id", "scribe_v1");
    apiFormData.append("tag_audio_events", "false");
    apiFormData.append("diarize", "false");
    
    // If a specific language is provided (not auto), use it
    // Otherwise, let ElevenLabs auto-detect
    if (validLanguage && validLanguage !== "auto") {
      // Convert language code format (e.g., "en-US" -> "eng", "ru-RU" -> "rus")
      const languageMap: Record<string, string> = {
        "en-US": "eng",
        "ru-RU": "rus",
        "uk-UA": "ukr",
        "es-ES": "spa",
        "fr-FR": "fra",
        "de-DE": "deu",
      };
      const isoCode = languageMap[validLanguage];
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
      console.error("ElevenLabs API error:", response.status);
      
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
      : validLanguage || "en-US";

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
