"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface FeedItem {
  id: string;
  type: "vote" | "new_stream" | "stream_extended" | "stream_skipped";
  text: string;
  timestamp: Date;
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function FeedIcon({ type }: { type: FeedItem["type"] }) {
  switch (type) {
    case "vote":
      return (
        <div className="w-6 h-6 rounded-md bg-secondary/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-secondary text-[10px]">
            how_to_vote
          </span>
        </div>
      );
    case "new_stream":
      return (
        <div className="w-6 h-6 rounded-md bg-primary-dim/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[10px]">
            play_arrow
          </span>
        </div>
      );
    case "stream_extended":
      return (
        <div className="w-6 h-6 rounded-md bg-tertiary/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-tertiary text-[10px]">
            add_circle
          </span>
        </div>
      );
    case "stream_skipped":
      return (
        <div className="w-6 h-6 rounded-md bg-error-container/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-error text-[10px]">
            close
          </span>
        </div>
      );
  }
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const lastBroadcastIdRef = useRef<string | null>(null);
  const lastVoteCountRef = useRef<number>(0);

  // Force re-render every 30s to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const addItem = useCallback(
    (item: Omit<FeedItem, "id" | "timestamp">) => {
      const newItem: FeedItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };
      setItems((prev) => [newItem, ...prev].slice(0, 20));
      if (feedRef.current) {
        feedRef.current.scrollTop = 0;
      }
    },
    []
  );

  // Poll broadcast state and derive activity events
  useEffect(() => {
    const pollActivity = async () => {
      try {
        const res = await fetch("/api/broadcasts");
        const data = await res.json();
        const bc = data.broadcast;

        if (!bc) {
          if (lastBroadcastIdRef.current) {
            addItem({ type: "stream_skipped", text: "Stream ended" });
            lastBroadcastIdRef.current = null;
            lastVoteCountRef.current = 0;
          }
          return;
        }

        // New stream detected
        if (bc.id !== lastBroadcastIdRef.current) {
          if (lastBroadcastIdRef.current) {
            addItem({ type: "stream_skipped", text: "Stream rotated" });
          }
          const streamName = bc.twitchDisplayName || bc.twitchUsername || "A new stream";
          addItem({ type: "new_stream", text: `${streamName} started playing` });
          lastBroadcastIdRef.current = bc.id;
          lastVoteCountRef.current = (bc.skipVotes ?? 0) + (bc.stayVotes ?? 0);
          return;
        }

        // Vote count changed
        const totalVotes = (bc.skipVotes ?? 0) + (bc.stayVotes ?? 0);
        if (totalVotes > lastVoteCountRef.current) {
          const newVotes = totalVotes - lastVoteCountRef.current;
          addItem({ type: "vote", text: `${newVotes} new vote${newVotes > 1 ? "s" : ""} cast` });
          lastVoteCountRef.current = totalVotes;
        }

        // Extension detected
        if (bc.status === "extended" && bc.extensionsCount > 0) {
          // Only add once per extension count change (tracked via vote count reset)
        }
      } catch {
        // Silently fail
      }
    };

    pollActivity();
    const interval = setInterval(pollActivity, 5_000);
    return () => clearInterval(interval);
  }, [addItem]);

  return (
    <div className="bg-surface-container/60 backdrop-blur-md rounded-[1.5rem] flex flex-col overflow-hidden h-[250px] xl:h-auto xl:flex-[2]">
      <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-secondary">
          <span
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            flash_on
          </span>
          Live Feed
        </h4>
        <span className="text-[10px] font-bold text-on-surface-variant">
          Real-time
        </span>
      </div>
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {items.length === 0 ? (
          <p className="text-[10px] text-on-surface-variant text-center py-4">
            Waiting for activity...
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <FeedIcon type={item.type} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] leading-tight text-on-surface">
                  {item.text}
                </p>
                <p className="text-[9px] text-on-surface-variant mt-0.5">
                  {relativeTime(item.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
