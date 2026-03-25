"use client";

import { UserMenu } from "./UserMenu";

export function TopBar() {
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
        {/* Zap Points */}
        <button className="hidden md:flex items-center gap-2 bg-primary-dim/10 hover:bg-primary-dim/20 px-4 py-2 rounded-full border border-primary-dim/20 transition-all group">
          <span className="material-symbols-outlined text-primary-dim group-hover:scale-110 transition-transform">
            bolt
          </span>
          <span className="text-sm text-primary">Zap Points: 0</span>
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
