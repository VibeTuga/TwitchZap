"use client";

import { useEffect, useCallback } from "react";
import {
  useBroadcastStore,
  type BroadcastState,
} from "@/stores/broadcastStore";

export type { BroadcastState };

export function useBroadcast() {
  const broadcast = useBroadcastStore((s) => s.broadcast);
  const loading = useBroadcastStore((s) => s.loading);
  const isReconnecting = useBroadcastStore((s) => s.isReconnecting);
  const setBroadcast = useBroadcastStore((s) => s.setBroadcast);
  const setLoading = useBroadcastStore((s) => s.setLoading);

  const fetchBroadcast = useCallback(async () => {
    try {
      const res = await fetch("/api/broadcasts");
      const data = await res.json();
      setBroadcast(data.broadcast ?? null);
    } catch {
      // Silently fail on fetch errors
    } finally {
      setLoading(false);
    }
  }, [setBroadcast, setLoading]);

  useEffect(() => {
    fetchBroadcast();

    const interval = setInterval(fetchBroadcast, 5_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchBroadcast();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchBroadcast]);

  return { broadcast, loading, isReconnecting, refetch: fetchBroadcast };
}
