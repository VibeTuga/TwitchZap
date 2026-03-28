"use client";

import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useVotingStore } from "@/stores/votingStore";

export function useVoting(broadcastId: string | null) {
  const counts = useVotingStore((s) => s.counts);
  const hasVoted = useVotingStore((s) => s.hasVoted);
  const isSubmitting = useVotingStore((s) => s.isSubmitting);
  const setCounts = useVotingStore((s) => s.setCounts);
  const setHasVoted = useVotingStore((s) => s.setHasVoted);
  const setIsSubmitting = useVotingStore((s) => s.setIsSubmitting);
  const reset = useVotingStore((s) => s.reset);

  // Poll vote counts from broadcast endpoint
  useEffect(() => {
    if (!broadcastId) return;

    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/broadcasts");
        const data = await res.json();
        if (data.broadcast && data.broadcast.id === broadcastId) {
          setCounts({
            skip: data.broadcast.skipVotes ?? 0,
            stay: data.broadcast.stayVotes ?? 0,
            total: (data.broadcast.skipVotes ?? 0) + (data.broadcast.stayVotes ?? 0),
          });
        }
      } catch {
        // Silently fail
      }
    };

    const interval = setInterval(fetchCounts, 5_000);
    return () => clearInterval(interval);
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
