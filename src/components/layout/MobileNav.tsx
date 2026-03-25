"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/live", label: "Live Now", icon: "play_circle", active: true },
  { href: "/schedule", label: "Schedule", icon: "calendar_today" },
  { href: "/profile", label: "Profile", icon: "person" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 w-full z-50 lg:hidden">
      <div className="flex gap-2 border-t border-surface-container-highest bg-surface-container-low px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/" || pathname === "/live"
              : pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-end gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {isActive && tab.label === "Live Now" && (
                <div className="absolute -top-3 w-10 h-10 bg-primary/20 rounded-full blur-xl" />
              )}
              <div className="flex h-8 items-center justify-center relative">
                <span
                  className="material-symbols-outlined"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {tab.icon}
                </span>
              </div>
              <p
                className={`text-[10px] leading-normal tracking-wide ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {tab.label}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
