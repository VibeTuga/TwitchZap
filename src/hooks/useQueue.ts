"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface QueueEntry {
  id: string;
  position: number;
  status: string;
  submittedAt: string;
  stream: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
    category: string | null;
  } | null;
  submittedBy: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
  } | null;
}

export function useQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      setQueue(data.queue ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();

    const supabase = createClient();

    const channel = supabase.channel("queue-updates").on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "queue",
      },
      () => {
        fetchQueue();
      }
    );

    channel.subscribe();

    // Fallback polling in case Realtime isn't enabled for this table
    const interval = setInterval(fetchQueue, 15_000);

    // Refetch when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchQueue();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchQueue]);

  return { queue, loading, refetch: fetchQueue };
}
