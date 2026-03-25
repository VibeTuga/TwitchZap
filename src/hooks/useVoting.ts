"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface VoteCounts {
  skip: number;
  stay: number;
  total: number;
}

export function useVoting(broadcastId: string | null) {
  const [counts, setCounts] = useState<VoteCounts>({
    skip: 0,
    stay: 0,
    total: 0,
  });
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!broadcastId) return;

    const supabase = createClient();

    const channel = supabase
      .channel("votes-live")
      .on("broadcast", { event: "vote_update" }, (payload) => {
        const data = payload.payload as VoteCounts & {
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
  }, [broadcastId]);

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
    [broadcastId, hasVoted, isSubmitting]
  );

  const reset = useCallback(() => {
    setHasVoted(false);
    setCounts({ skip: 0, stay: 0, total: 0 });
  }, []);

  return { counts, hasVoted, isSubmitting, castVote, setHasVoted, reset };
}
