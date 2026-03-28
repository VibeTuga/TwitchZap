"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/stores/authStore";
import { UserMenu } from "./UserMenu";
import { ZapPoints } from "@/components/gamification/ZapPoints";
import { useSoundEffects } from "@/lib/sounds";
import { usePresence } from "@/hooks/usePresence";

export function TopBar() {
  const { user } = useAuth();
  const [zapPoints, setZapPoints] = useState<number | null>(null);
  const { soundEnabled, toggleSound } = useSoundEffects();
  const { viewerCount } = usePresence(user?.id ?? null);

  useEffect(() => {
    if (!user) return;

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.zapPoints != null) setZapPoints(data.zapPoints);
      })
      .catch(() => {});

    return () => setZapPoints(null);
  }, [user]);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 h-14 md:h-16 shadow-[0_4px_30px_rgba(170,48,250,0.1)] font-headline font-semibold">
      {/* Mobile logo + viewer count */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center shadow-[0_0_16px_rgba(211,148,255,0.3)]">
          <span
            className="material-symbols-outlined text-on-primary-fixed text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
        </div>
        <span className="font-headline font-bold text-lg text-primary tracking-tight">
          TwitchZap
        </span>
        {viewerCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
            {viewerCount}
          </span>
        )}
      </div>

      {/* Viewer count — desktop (hidden on mobile, shown alongside search) */}
      {viewerCount > 0 && (
        <div className="hidden lg:flex items-center gap-1.5 bg-surface-container rounded-full px-3 py-1.5 text-xs text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <span>{viewerCount} online</span>
        </div>
      )}

      {/* Search — hidden on mobile */}
      <div className="hidden md:flex items-center bg-surface-container-high rounded-full px-4 py-2 w-96 max-w-[50%] focus-within:ring-1 focus-within:ring-primary-dim transition-all">
        <span className="material-symbols-outlined text-on-surface-variant mr-2">
          search
        </span>
        <input
          className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-on-surface-variant text-on-surface"
          placeholder="Search streamers, categories..."
          type="text"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 md:gap-6">
        {zapPoints !== null && (
          <ZapPoints points={zapPoints} className="hidden md:flex" />
        )}
        {zapPoints !== null && (
          <div className="flex flex-col items-end md:hidden">
            <span className="text-[10px] font-label text-on-surface-variant uppercase tracking-wider">Zap</span>
            <span className="font-headline font-bold text-primary text-sm">{zapPoints.toLocaleString()}</span>
          </div>
        )}

        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          aria-label={soundEnabled ? "Mute sound effects" : "Enable sound effects"}
          title={soundEnabled ? "Mute sound effects" : "Enable sound effects"}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
