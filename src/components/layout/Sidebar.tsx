"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Live Stream", icon: "sensors", filled: true },
  { href: "/schedule", label: "Schedule", icon: "calendar_today", filled: false },
  { href: "/submit", label: "Submit", icon: "publish", filled: false },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard", filled: false },
  { href: "/profile", label: "Profile", icon: "person", filled: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low font-headline tracking-tight flex-col py-6 px-4 z-50 hidden lg:flex">
      {/* Logo */}
      <div className="mb-10 px-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-dim flex items-center justify-center shadow-[0_0_20px_rgba(170,48,250,0.4)]">
          <span
            className="material-symbols-outlined text-on-primary-fixed"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-primary leading-none">
            TwitchZap
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mt-1">
            Community Powered
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 group ${
                isActive
                  ? "text-primary font-bold border-r-2 border-primary-dim"
                  : "text-slate-400 font-medium hover:bg-surface-container-high hover:text-[#bef264]"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={
                  isActive
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Active Quorum */}
      <div className="mt-auto p-4 bg-surface-container rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
            Active Quorum
          </span>
          <span className="text-[10px] font-bold text-on-surface-variant">
            0%
          </span>
        </div>
        <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary shadow-[0_0_10px_rgba(89,238,80,0.5)]"
            style={{ width: "0%" }}
          />
        </div>
      </div>
    </aside>
  );
}
