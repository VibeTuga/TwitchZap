"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const setIsReconnecting = useBroadcastStore((s) => s.setIsReconnecting);
  const updateBroadcast = useBroadcastStore((s) => s.updateBroadcast);

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

    const supabase = createClient();

    const channel = supabase.channel("broadcast-live").on(
      "broadcast",
      { event: "new_stream" },
      () => {
        fetchBroadcast();
      }
    ).on(
      "broadcast",
      { event: "voting_open" },
      () => {
        updateBroadcast((prev) =>
          prev ? { ...prev, status: "voting" } : null
        );
      }
    ).on(
      "broadcast",
      { event: "vote_update" },
      (payload) => {
        const data = payload.payload as {
          skip: number;
          stay: number;
          total: number;
        };
        updateBroadcast((prev) =>
          prev
            ? {
                ...prev,
                skipVotes: data.skip,
                stayVotes: data.stay,
                totalVotes: data.total,
              }
            : null
        );
      }
    ).on(
      "broadcast",
      { event: "stream_extended" },
      (payload) => {
        const data = payload.payload as {
          new_end: string;
          extensions_count: number;
        };
        updateBroadcast((prev) =>
          prev
            ? {
                ...prev,
                status: "extended",
                scheduledEndAt: data.new_end,
                extensionsCount: data.extensions_count,
                votingResult: "pending",
                has_voted: false,
              }
            : null
        );
      }
    ).on(
      "broadcast",
      { event: "stream_skipped" },
      () => {
        setBroadcast(null);
        fetchBroadcast();
      }
    ).on(
      "broadcast",
      { event: "stream_ended" },
      () => {
        setBroadcast(null);
        fetchBroadcast();
      }
    ).on(
      "broadcast",
      { event: "stream_reconnecting" },
      (payload) => {
        const data = payload.payload as {
          grace_period_expires_at: string;
        };
        setIsReconnecting(true);
        updateBroadcast((prev) =>
          prev
            ? { ...prev, gracePeriodExpiresAt: data.grace_period_expires_at }
            : null
        );
      }
    ).on(
      "broadcast",
      { event: "stream_recovered" },
      () => {
        setIsReconnecting(false);
        updateBroadcast((prev) =>
          prev
            ? {
                ...prev,
                offlineDetectedAt: null,
                gracePeriodExpiresAt: null,
              }
            : null
        );
      }
    );

    channel.subscribe();

    // Fallback polling so broadcast state stays current even if
    // Realtime events are missed (e.g. network hiccup, cold start)
    const interval = setInterval(fetchBroadcast, 15_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchBroadcast();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchBroadcast, setBroadcast, setIsReconnecting, updateBroadcast]);

  return { broadcast, loading, isReconnecting, refetch: fetchBroadcast };
}
