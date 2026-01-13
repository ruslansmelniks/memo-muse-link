import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Pause, Play, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);
  const [showCancelFeedback, setShowCancelFeedback] = useState(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  const haptics = useHaptics();

  // Get the best supported MIME type for the current browser
  const getSupportedMimeType = (): string => {
    // Priority order: prefer formats that work on iOS Safari
    const types = [
      'audio/mp4',           // iOS Safari preferred
      'audio/aac',           // iOS Safari supported
      'audio/webm;codecs=opus', // Chrome/Firefox preferred
      'audio/webm',          // Generic WebM
      'audio/ogg;codecs=opus', // Firefox fallback
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeTypeRef.current = type;
        return type;
      }
    }
    
    // Fallback - let browser decide
    mimeTypeRef.current = "";
    return "";
  };

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
      
      // Determine the best MIME type for the browser (iOS Safari prefers mp4/aac)
      const mimeType = getSupportedMimeType();
      console.log("Using MIME type:", mimeType);
      
      // Set up audio recording with compatible format
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
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
      // Show completion feedback
      setShowCompletionFeedback(true);
      setTimeout(() => setShowCompletionFeedback(false), 800);
      
      // Capture duration before we reset
      const finalDuration = duration;
      
      mediaRecorderRef.current.onstop = () => {
        // Use the MIME type that was actually used for recording
        const actualMimeType = mimeTypeRef.current || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        console.log("Created audio blob:", audioBlob.type, audioBlob.size);
        
        // ElevenLabs will do the transcription - no browser speech recognition needed
        onRecordingComplete("", finalDuration, audioBlob, selectedLanguage);
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

  const cancelRecording = () => {
    haptics.notification("warning");
    
    if (isRecording && mediaRecorderRef.current) {
      // Show cancel feedback
      setShowCancelFeedback(true);
      setTimeout(() => setShowCancelFeedback(false), 600);
      
      // Stop without triggering onstop handler
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      
      // Stop audio visualization
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Reset everything
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setAudioLevels(Array(12).fill(0.2));
      audioChunksRef.current = [];
    }
  };

  const togglePause = () => {
    haptics.selection();
    
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      updateAudioLevels();
    } else {
      mediaRecorderRef.current.pause();
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

  const selectedLangDisplay = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-muted/30 rounded-3xl p-10 border border-border/50 relative overflow-hidden"
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
        <div className="flex items-center justify-center gap-1 h-28">
          {audioLevels.map((level, i) => (
            <motion.div
              key={i}
              className={cn(
                "w-1.5 rounded-full",
                isRecording && !isPaused 
                  ? "bg-gradient-to-t from-primary/60 to-primary" 
                  : "bg-muted-foreground/20"
              )}
              initial={{ height: "15%" }}
              animate={{ 
                height: isRecording && !isPaused 
                  ? `${Math.max(15, level * 100)}%` 
                  : "15%",
                scaleY: isRecording && !isPaused ? [1, 1.1, 1] : 1,
              }}
              transition={{
                height: { duration: 0.08, ease: "easeOut" },
                scaleY: { 
                  duration: 0.3 + (i * 0.02), 
                  repeat: isRecording && !isPaused ? Infinity : 0,
                  ease: "easeInOut"
                }
              }}
              style={{
                originY: 0.5,
              }}
            />
          ))}
        </div>

        {/* Timer with animation */}
        <motion.div 
          key={isRecording ? "recording" : "idle"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-display font-semibold text-foreground tracking-tight"
        >
          {formatTime(duration)}
        </motion.div>

        {/* Completion/Cancel Feedback Overlay */}
        <AnimatePresence>
          {showCompletionFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-3xl z-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-primary-foreground" />
              </motion.div>
            </motion.div>
          )}
          {showCancelFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-3xl z-10"
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-10 h-10 text-muted-foreground" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Transcript Preview - Removed for less distraction */}

        {/* Controls */}
        <div className="flex items-center gap-6 pt-2">
          <AnimatePresence mode="wait">
            {!isRecording ? (
              <motion.div
                key="start-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="rounded-full"
              >
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 0 0 hsl(var(--primary) / 0.4)",
                      "0 0 0 16px hsl(var(--primary) / 0)",
                      "0 0 0 0 hsl(var(--primary) / 0)"
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="rounded-full"
                >
                  <Button
                    variant="hero"
                    size="iconLg"
                    onClick={startRecording}
                    className="w-28 h-28 rounded-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 min-w-8 min-h-8" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M52 75.9V86h14c1.1 0 2 .9 2 2s-.9 2-2 2H34c-1.1 0-2-.9-2-2s.9-2 2-2h14V75.9c-13.4-1-24-12.3-24-25.9 0-1.1.9-2 2-2s2 .9 2 2c0 12.1 9.9 22 22 22s22-9.9 22-22c0-1.1.9-2 2-2s2 .9 2 2c0 13.7-10.6 24.9-24 25.9zM65 25v25c0 8.3-6.7 15-15 15s-15-6.7-15-15V25c0-8.3 6.7-15 15-15s15 6.7 15 15zm-4 0c0-6.1-4.9-11-11-11s-11 4.9-11 11v25c0 6.1 4.9 11 11 11s11-4.9 11-11V25z"/>
                    </svg>
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="recording-controls"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-6"
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelRecording}
                    className="text-muted-foreground hover:text-foreground hover:bg-destructive/10"
                    title="Cancel recording"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 400 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePause}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <AnimatePresence mode="wait">
                      {isPaused ? (
                        <motion.div
                          key="play"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Play className="h-6 w-6" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="pause"
                          initial={{ scale: 0, rotate: 90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: -90 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Pause className="h-6 w-6" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    animate={!isPaused ? { 
                      boxShadow: [
                        "0 0 20px 8px hsl(var(--destructive) / 0.4)",
                        "0 0 40px 16px hsl(var(--destructive) / 0.6)",
                        "0 0 20px 8px hsl(var(--destructive) / 0.4)"
                      ]
                    } : {}}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="rounded-full"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Button
                      variant="hero"
                      size="iconLg"
                      onClick={stopRecording}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        stopRecording();
                      }}
                      className="w-20 h-20 rounded-full touch-manipulation"
                    >
                      <Square className="h-6 w-6" />
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
      </div>
    </motion.div>
  );
}
