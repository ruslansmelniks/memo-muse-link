import { useRef, useEffect, useCallback, useState } from "react";

interface BlobVisualizerProps {
  isActive: boolean;
  audioLevel: number; // 0-1, average audio level
  className?: string;
}

export function BlobVisualizer({ isActive, audioLevel, className = "" }: BlobVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const smoothedLevelRef = useRef(0);
  const [primaryColor, setPrimaryColor] = useState({ r: 232, g: 121, b: 91 }); // Coral fallback

  // Get the actual primary color from CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const hsl = style.getPropertyValue("--primary").trim();
    if (hsl) {
      // Parse HSL values and convert to RGB for canvas
      const [h, s, l] = hsl.split(" ").map(v => parseFloat(v));
      const rgb = hslToRgb(h, s / 100, l / 100);
      setPrimaryColor(rgb);
    }
  }, []);

  // HSL to RGB conversion
  const hslToRgb = (h: number, s: number, l: number) => {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h / 360 + 1/3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  };

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
    const centerX = width / 2;
    const centerY = height / 2;

    // Smooth the audio level
    const targetLevel = isActive ? audioLevel : 0;
    smoothedLevelRef.current += (targetLevel - smoothedLevelRef.current) * 0.08;
    const level = smoothedLevelRef.current;

    // Update time
    timeRef.current += isActive ? 0.03 : 0.01;
    const time = timeRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Base radius that responds to audio (30% bigger)
    const baseRadius = Math.min(width, height) * 0.325;
    const audioBoost = isActive ? 1 + level * 1.5 : 1;
    const radius = baseRadius * audioBoost;

    // Draw multiple blob layers for depth
    const layers = [
      { scale: 1.3, opacity: 0.08, speed: 0.7 },
      { scale: 1.15, opacity: 0.15, speed: 0.85 },
      { scale: 1.0, opacity: 0.25, speed: 1.0 },
    ];

    layers.forEach((layer) => {
      const layerRadius = radius * layer.scale;
      const points = 180;
      
      ctx.beginPath();
      
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        
        // Create organic blob shape with multiple sine waves
        const noise1 = Math.sin(angle * 3 + time * layer.speed) * 0.15;
        const noise2 = Math.sin(angle * 5 - time * layer.speed * 1.3) * 0.1;
        const noise3 = Math.sin(angle * 7 + time * layer.speed * 0.7) * 0.05;
        const audioNoise = isActive ? Math.sin(angle * 8 + time * 2) * level * 0.2 : 0;
        
        const distortion = 1 + noise1 + noise2 + noise3 + audioNoise;
        const r = layerRadius * distortion;
        
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      
      // Create gradient fill
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, layerRadius * 1.2
      );
      
      const { r, g, b } = primaryColor;
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${layer.opacity * 1.5})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${layer.opacity})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    // Draw subtle inner glow when active
    if (isActive && level > 0.1) {
      const glowRadius = radius * 0.6;
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, glowRadius
      );
      
      const { r, g, b } = primaryColor;
      const glowOpacity = level * 0.3;
      glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowOpacity})`);
      glowGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [audioLevel, isActive, primaryColor]);

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
