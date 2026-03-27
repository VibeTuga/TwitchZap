"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueueStore, type QueueEntry } from "@/stores/queueStore";

export type { QueueEntry };

export function useQueue() {
  const queue = useQueueStore((s) => s.queue);
  const loading = useQueueStore((s) => s.loading);
  const setQueue = useQueueStore((s) => s.setQueue);
  const setLoading = useQueueStore((s) => s.setLoading);

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
  }, [setQueue, setLoading]);

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
