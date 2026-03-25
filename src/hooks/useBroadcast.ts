"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface BroadcastState {
  id: string;
  queueEntryId: string;
  streamId: string;
  submittedBy: string | null;
  startedAt: string;
  scheduledEndAt: string;
  actualEndAt: string | null;
  extensionsCount: number;
  maxExtensions: number;
  status: string;
  votingOpensAt: string | null;
  votingResult: string | null;
  totalVotes: number;
  skipVotes: number;
  stayVotes: number;
  streamTitle: string | null;
  streamCategory: string | null;
  streamViewerCount: number | null;
  offlineDetectedAt: string | null;
  gracePeriodExpiresAt: string | null;
  recoveryCount: number;
  stream: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
    category: string | null;
    twitchChannelId: string;
  } | null;
  submitter: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
  } | null;
  has_voted: boolean;
}

export function useBroadcast() {
  const [broadcast, setBroadcast] = useState<BroadcastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

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
  }, []);

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
        setBroadcast((prev) =>
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
        setBroadcast((prev) =>
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
        setBroadcast((prev) =>
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
        setBroadcast((prev) =>
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
        setBroadcast((prev) =>
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBroadcast]);

  return { broadcast, loading, isReconnecting, refetch: fetchBroadcast };
}
