"use client";

import { useSyncExternalStore, useCallback, useRef, useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const STORAGE_KEY = "soundEnabled";

// Module-level store so all hook instances share the same state
let soundEnabled = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return soundEnabled;
}

function getServerSnapshot() {
  return false;
}

// Initialize from localStorage on first load
if (typeof window !== "undefined") {
  try {
    soundEnabled = localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // localStorage unavailable
  }
}

function toggleSoundEnabled() {
  soundEnabled = !soundEnabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(soundEnabled));
  } catch {
    // localStorage unavailable
  }
  emitChange();
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

// Shared AudioContext ref across all hook instances
let sharedCtx: AudioContext | null = null;

export function useSoundEffects() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const reducedMotion = useReducedMotion();
  const canPlayRef = useRef(false);

  useEffect(() => {
    canPlayRef.current = enabled && !reducedMotion;
  }, [enabled, reducedMotion]);

  const getContext = useCallback(() => {
    if (!canPlayRef.current) return null;
    if (!sharedCtx || sharedCtx.state === "closed") {
      sharedCtx = getAudioContext();
    }
    if (sharedCtx?.state === "suspended") {
      sharedCtx.resume();
    }
    return sharedCtx;
  }, []);

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
    toggleSound: toggleSoundEnabled,
    playVoteSound,
    playExtensionSound,
    playTransitionSound,
    playBadgeSound,
  };
}
