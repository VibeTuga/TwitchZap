"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const STORAGE_KEY = "soundEnabled";

function getStoredSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

/** Short 440Hz sine boop (100ms) */
function playBoop(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

/** Ascending three-tone chime: 440Hz, 554Hz, 659Hz (150ms each) */
function playChime(ctx: AudioContext) {
  const frequencies = [440, 554, 659];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const startTime = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
  });
}

/** Soft whoosh: bandpass-filtered white noise with 300ms fade */
function playWhoosh(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
}

/** Bright two-note jingle: 523Hz, 784Hz (200ms each) */
function playJingle(ctx: AudioContext) {
  const frequencies = [523, 784];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const startTime = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  });
}

export function useSoundEffects() {
  const [enabled, setEnabled] = useState(false);
  const reducedMotion = useReducedMotion();
  const ctxRef = useRef<AudioContext | null>(null);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setEnabled(getStoredSoundEnabled());
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  const getContext = useCallback(() => {
    if (!enabled || reducedMotion) return null;
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = getAudioContext();
    }
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, [enabled, reducedMotion]);

  const playVoteSound = useCallback(() => {
    const ctx = getContext();
    if (ctx) playBoop(ctx);
  }, [getContext]);

  const playExtensionSound = useCallback(() => {
    const ctx = getContext();
    if (ctx) playChime(ctx);
  }, [getContext]);

  const playTransitionSound = useCallback(() => {
    const ctx = getContext();
    if (ctx) playWhoosh(ctx);
  }, [getContext]);

  const playBadgeSound = useCallback(() => {
    const ctx = getContext();
    if (ctx) playJingle(ctx);
  }, [getContext]);

  return {
    soundEnabled: enabled,
    toggleSound: toggle,
    playVoteSound,
    playExtensionSound,
    playTransitionSound,
    playBadgeSound,
  };
}
