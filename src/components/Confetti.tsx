"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const COLORS = ["#d394ff", "#59ee50", "#aa30fa", "#49e043", "#cb80ff"];

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
    }));
    const raf = requestAnimationFrame(() => setParticles(newParticles));

    const timer = setTimeout(() => setParticles([]), 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      setParticles([]);
    };
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-pop ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

export function ExtensionText({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    const raf = requestAnimationFrame(() => setShow(true));
    const timer = setTimeout(() => setShow(false), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      setShow(false);
    };
  }, [active]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[201]">
      <span className="text-3xl font-headline font-black text-secondary animate-float-up drop-shadow-[0_0_20px_rgba(89,238,80,0.6)]">
        +10 MIN
      </span>
    </div>
  );
}
