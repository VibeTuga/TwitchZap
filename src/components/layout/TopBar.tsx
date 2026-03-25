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
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl flex items-center justify-between px-8 h-16 lg:ml-64 shadow-[0_4px_30px_rgba(170,48,250,0.1)] font-headline font-semibold">
      {/* Search */}
      <div className="flex items-center bg-surface-container-high rounded-full px-4 py-2 w-96 max-w-[50%] focus-within:ring-1 focus-within:ring-primary-dim transition-all">
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
      <div className="flex items-center gap-6">
        {zapPoints !== null && (
          <ZapPoints points={zapPoints} className="hidden md:flex" />
        )}

        <UserMenu />
      </div>
    </header>
  );
}
