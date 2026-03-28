"use client";

import { useEffect, useCallback } from "react";
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

    const interval = setInterval(fetchQueue, 10_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchQueue();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchQueue]);

  return { queue, loading, refetch: fetchQueue };
}
