import { useState, useRef, useEffect } from "react";
import { Mic, Square, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface VoiceRecorderProps {
  onRecordingComplete: (transcript: string, duration: number) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0.2));
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

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
    if (isRecording) {
      // Stop speech recognition
      stopListening();
      
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
      
      // Get the final transcript
      const finalTranscript = transcript || interimTranscript;
      if (finalTranscript.trim()) {
        onRecordingComplete(finalTranscript.trim(), duration);
      }
    }
  };

  const togglePause = () => {
    if (isPaused) {
      startListening();
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      updateAudioLevels();
    } else {
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

  return (
    <div className="glass-card rounded-3xl p-8 shadow-medium">
      <div className="flex flex-col items-center space-y-6">
        {/* Audio Visualizer */}
        <div className="flex items-center justify-center gap-1 h-20">
          {audioLevels.map((level, i) => (
            <div
              key={i}
              className={cn(
                "w-2 rounded-full transition-all duration-100",
                isRecording && !isPaused ? "gradient-primary" : "bg-muted"
              )}
              style={{
                height: `${level * 100}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-4xl font-display font-semibold text-foreground">
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
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <Button
              variant="hero"
              size="iconLg"
              onClick={startRecording}
              className="shadow-glow"
              disabled={!isSupported}
            >
              <Mic className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <Button
                variant="glass"
                size="icon"
                onClick={togglePause}
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
              <Button
                variant="hero"
                size="iconLg"
                onClick={stopRecording}
              >
                <Square className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {!isSupported ? (
            <span className="text-destructive">Speech recognition not supported in this browser</span>
          ) : speechError ? (
            <span className="text-destructive">{speechError}</span>
          ) : isRecording ? (
            isPaused 
              ? "Paused - tap to resume" 
              : "Recording & transcribing... tap to stop"
          ) : (
            "Tap to start recording your thoughts"
          )}
        </p>
      </div>
    </div>
  );
}
