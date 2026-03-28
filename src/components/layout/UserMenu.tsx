"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useAuth } from "@/stores/authStore";

export function UserMenu() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role === "admin") setIsAdmin(true);
        else setIsAdmin(false);
      })
      .catch(() => setIsAdmin(false));

    return () => setIsAdmin(false);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() =>
            signIn("twitch", {
              callbackUrl: window.location.pathname,
            })
          }
          className="hidden md:flex items-center gap-2 bg-[#9146FF]/20 hover:bg-[#9146FF]/40 px-4 py-2 rounded-full border border-[#9146FF]/40 backdrop-blur-md transition-all group shadow-[0_0_15px_rgba(145,70,255,0.3)] hover:shadow-[0_0_20px_rgba(145,70,255,0.5)]"
        >
          <span className="material-symbols-outlined text-[#bf94ff] text-sm group-hover:rotate-12 transition-transform">
            link
          </span>
          <span className="text-[11px] font-bold text-white tracking-wide">
            Connect with Twitch
          </span>
        </button>
        <span className="material-symbols-outlined text-slate-300 hover:text-[#22d3ee] cursor-pointer transition-colors">
          notifications
        </span>
      </>
    );
  }

  const avatarUrl = user.avatar || user.image;
  const displayName = user.twitchUsername || user.name || "User";

  return (
    <div className="flex items-center gap-3">
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary-dim cursor-pointer"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-primary-dim flex items-center justify-center text-xs font-bold text-on-primary-fixed">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-high rounded-xl py-2 shadow-2xl z-50">
            <div className="px-4 py-2 border-b border-outline-variant/20">
              <p className="text-sm font-bold text-on-surface truncate">
                {displayName}
              </p>
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  admin_panel_settings
                </span>
                Admin Dashboard
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
      <span className="material-symbols-outlined text-slate-300 hover:text-[#22d3ee] cursor-pointer transition-colors">
        notifications
      </span>
    </div>
  );
}
