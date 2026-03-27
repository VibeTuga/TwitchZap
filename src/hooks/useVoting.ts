"use client";

import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useVotingStore } from "@/stores/votingStore";

export function useVoting(broadcastId: string | null) {
  const counts = useVotingStore((s) => s.counts);
  const hasVoted = useVotingStore((s) => s.hasVoted);
  const isSubmitting = useVotingStore((s) => s.isSubmitting);
  const setCounts = useVotingStore((s) => s.setCounts);
  const setHasVoted = useVotingStore((s) => s.setHasVoted);
  const setIsSubmitting = useVotingStore((s) => s.setIsSubmitting);
  const reset = useVotingStore((s) => s.reset);

  useEffect(() => {
    if (!broadcastId) return;

    const supabase = createClient();

    const channel = supabase
      .channel("votes-live")
      .on("broadcast", { event: "vote_update" }, (payload) => {
        const data = payload.payload as {
          skip: number;
          stay: number;
          total: number;
          broadcast_id: string;
        };
        if (data.broadcast_id === broadcastId) {
          setCounts({
            skip: data.skip,
            stay: data.stay,
            total: data.total,
          });
        }
      });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [broadcastId, setCounts]);

  const castVote = useCallback(
    async (vote: "skip" | "stay") => {
      if (!broadcastId || hasVoted || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ broadcast_id: broadcastId, vote }),
        });

        if (res.ok) {
          const data = await res.json();
          setHasVoted(true);
          setCounts({
            skip: data.current_totals.skip,
            stay: data.current_totals.stay,
            total: data.current_totals.skip + data.current_totals.stay,
          });

          // Show badge toasts for newly earned badges
          if (data.new_badges?.length > 0) {
            for (const badge of data.new_badges) {
              toast.success(`Badge Unlocked: ${badge.name}!`, {
                description: badge.pointsReward > 0
                  ? `${badge.icon} +${badge.pointsReward} bonus Zap Points`
                  : badge.icon,
              });
            }
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [broadcastId, hasVoted, isSubmitting, setCounts, setHasVoted, setIsSubmitting]
  );

  return { counts, hasVoted, isSubmitting, castVote, setHasVoted, reset };
}
