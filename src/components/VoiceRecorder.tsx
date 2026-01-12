import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useHaptics } from "@/hooks/useHaptics";
import { LanguageSelector, SUPPORTED_LANGUAGES } from "@/components/LanguageSelector";

interface VoiceRecorderProps {
  onRecordingComplete: (transcript: string, duration: number, audioBlob: Blob | null, language: string) => void;
  initialLanguage?: string;
}

export function VoiceRecorder({ onRecordingComplete, initialLanguage = "auto" }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0.2));
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  const {
    transcript,
    interimTranscript,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(selectedLanguage === "auto" ? "en-US" : selectedLanguage);

  const haptics = useHaptics();

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const updateAudioLevels = () => {
    if (!analyserRef.current || !isRecording || isPaused) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const levels = [];
    const step = Math.floor(dataArray.length / 12);
    for (let i = 0; i < 12; i++) {
      const value = dataArray[i * step] / 255;
      levels.push(Math.max(0.15, value));
    }
    setAudioLevels(levels);
    
    animationRef.current = requestAnimationFrame(updateAudioLevels);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Set up audio recording
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.start();
      
      // Set up audio visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      setIsRecording(true);
      setDuration(0);
      resetTranscript();
      
      // Start speech recognition
      startListening();
      
      intervalRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      
      updateAudioLevels();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    haptics.notification("success");
    
    if (isRecording && mediaRecorderRef.current) {
      // Stop speech recognition
      stopListening();
      
      // Capture duration before we reset
      const finalDuration = duration;
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const finalTranscript = transcript || interimTranscript;
        
        // Always call onRecordingComplete - ElevenLabs will do the transcription
        // even if browser speech recognition failed
        onRecordingComplete(finalTranscript.trim(), finalDuration, audioBlob, selectedLanguage);
      };
      
      mediaRecorderRef.current.stop();
      
      // Stop audio visualization
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevels(Array(12).fill(0.2));
    }
  };

  const togglePause = () => {
    haptics.selection();
    
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      startListening();
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      updateAudioLevels();
    } else {
      mediaRecorderRef.current.pause();
      stopListening();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    setIsPaused(!isPaused);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : "");
  
  const selectedLangDisplay = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-muted/30 rounded-3xl p-10 border border-border/50"
    >
      <div className="flex flex-col items-center space-y-8">
        {/* Language Selector */}
        <div className="w-full flex justify-center">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            disabled={isRecording}
          />
        </div>

        {/* Audio Visualizer */}
        <div className="flex items-center justify-center gap-1.5 h-24">
          {audioLevels.map((level, i) => (
            <div
              key={i}
              className={cn(
                "w-2 rounded-full transition-all duration-100",
                isRecording && !isPaused ? "bg-foreground/60" : "bg-muted-foreground/30"
              )}
              style={{
                height: `${level * 100}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-5xl font-display font-semibold text-foreground tracking-tight">
          {formatTime(duration)}
        </div>

        {/* Live Transcript Preview */}
        {isRecording && displayTranscript && (
          <div className="w-full max-h-24 overflow-y-auto">
            <p className="text-sm text-muted-foreground text-center italic">
              "{displayTranscript}"
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6 pt-2">
          {!isRecording ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="hero"
                size="iconLg"
                onClick={startRecording}
                disabled={!isSupported}
                className="w-20 h-20 rounded-full"
              >
                <Mic className="h-8 w-8" />
              </Button>
            </motion.div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePause}
                className="text-muted-foreground hover:text-foreground"
              >
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </Button>
              <Button
                variant="hero"
                size="iconLg"
                onClick={stopRecording}
                className="w-20 h-20 rounded-full"
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {isRecording ? (
            isPaused 
              ? "Paused — tap to resume" 
              : `Recording in ${selectedLangDisplay?.name || "Auto"}... tap to stop`
          ) : (
            "Tap to start recording"
          )}
        </p>
        {speechError && !isRecording && (
          <p className="text-xs text-muted-foreground/70 text-center">
            Live preview unavailable • Audio will be transcribed after recording
          </p>
        )}
      </div>
    </motion.div>
  );
}
