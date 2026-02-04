import { useRef, useEffect, useCallback, useState } from "react";

interface SiriWaveformProps {
  isActive: boolean;
  audioLevel: number; // 0-1, average audio level
  className?: string;
}

interface Wave {
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
  opacity: number;
}

export function SiriWaveform({ isActive, audioLevel, className = "" }: SiriWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const smoothedLevelRef = useRef(0);
  const [primaryColor, setPrimaryColor] = useState("rgb(232, 121, 91)"); // Coral fallback

  // Get the actual primary color from CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const hsl = style.getPropertyValue("--primary").trim();
    if (hsl) {
      // Convert HSL to a format canvas can use
      setPrimaryColor(`hsl(${hsl})`);
    }
  }, []);

  const waves: Wave[] = [
    { amplitude: 0.5, frequency: 1.2, phase: 0, speed: 0.03, opacity: 0.15 },
    { amplitude: 0.4, frequency: 1.8, phase: 0.5, speed: 0.025, opacity: 0.25 },
    { amplitude: 0.35, frequency: 2.2, phase: 1, speed: 0.035, opacity: 0.4 },
    { amplitude: 0.3, frequency: 2.8, phase: 1.5, speed: 0.02, opacity: 0.6 },
    { amplitude: 0.25, frequency: 3.2, phase: 2, speed: 0.04, opacity: 0.8 },
  ];

  const drawWave = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    wave: Wave,
    globalPhase: number,
    level: number,
    color: string
  ) => {
    const centerY = height / 2;
    const amplitudeMultiplier = isActive ? 0.3 + level * 0.7 : 0.1;
    const baseAmplitude = (height / 2) * wave.amplitude * amplitudeMultiplier;
    
    ctx.beginPath();
    ctx.moveTo(0, centerY);

    // Draw the wave using bezier curves for smoothness
    for (let x = 0; x <= width; x += 2) {
      const normalizedX = x / width;
      
      // Create a natural envelope that tapers at edges
      const envelope = Math.sin(normalizedX * Math.PI);
      
      // Combine multiple sine waves for organic movement
      const y1 = Math.sin(normalizedX * Math.PI * 2 * wave.frequency + globalPhase + wave.phase);
      const y2 = Math.sin(normalizedX * Math.PI * 3 * wave.frequency + globalPhase * 1.3 + wave.phase) * 0.3;
      const y3 = Math.sin(normalizedX * Math.PI * 5 * wave.frequency + globalPhase * 0.7 + wave.phase) * 0.15;
      
      const combinedY = (y1 + y2 + y3) * envelope * baseAmplitude;
      
      ctx.lineTo(x, centerY + combinedY);
    }

    // Complete the wave shape for fill
    ctx.lineTo(width, centerY);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = wave.opacity;
    ctx.stroke();
    
    // Fill under the wave for more depth
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = wave.opacity * 0.2;
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }, [isActive]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get actual pixel dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio for sharpness
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = rect.width;
    const height = rect.height;

    // Smooth the audio level for less jittery animation
    const targetLevel = isActive ? audioLevel : 0;
    smoothedLevelRef.current += (targetLevel - smoothedLevelRef.current) * 0.1;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Update phase
    phaseRef.current += isActive ? 0.05 : 0.02;

    // Draw each wave layer
    waves.forEach((wave, index) => {
      const wavePhase = phaseRef.current * wave.speed * 50 + index * 0.5;
      drawWave(ctx, width, height, wave, wavePhase, smoothedLevelRef.current, primaryColor);
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [audioLevel, isActive, drawWave, waves, primaryColor]);

  useEffect(() => {
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ 
        width: "100%", 
        height: "100%",
      }}
    />
  );
}
