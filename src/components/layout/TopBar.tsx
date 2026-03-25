"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserMenu } from "./UserMenu";
import { ZapPoints } from "@/components/gamification/ZapPoints";

export function TopBar() {
  const [zapPoints, setZapPoints] = useState<number | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchPoints() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setZapPoints(null);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("zap_points")
        .eq("id", user.id)
        .single();

      if (data) {
        setZapPoints(data.zap_points);
      }
    }

    fetchPoints();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchPoints();
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 h-14 md:h-16 lg:ml-64 shadow-[0_4px_30px_rgba(170,48,250,0.1)] font-headline font-semibold">
      {/* Mobile logo */}
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
      </div>

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

        <UserMenu />
      </div>
    </header>
  );
}
