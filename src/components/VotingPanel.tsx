"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSoundEffects } from "@/lib/sounds";
import { toast } from "sonner";
import type { BroadcastState } from "@/hooks/useBroadcast";

interface VotingPanelProps {
  broadcast: BroadcastState;
  onVote: (vote: "skip" | "stay") => Promise<void>;
  hasVoted: boolean;
  isSubmitting: boolean;
  counts: { skip: number; stay: number; total: number };
  onExtension?: () => void;
}

function CountdownTimer({ endTime }: { endTime: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const ms = new Date(endTime).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("0:00");
        return;
      }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <span className="text-lg font-headline font-bold text-on-surface tabular-nums animate-countdown-pulse">
      {remaining}
    </span>
  );
}

export function VotingPanel({
  broadcast,
  onVote,
  hasVoted,
  isSubmitting,
  counts,
  onExtension,
}: VotingPanelProps) {
  const reduced = useReducedMotion();
  const { playVoteSound, playExtensionSound } = useSoundEffects();
  const [selectedVote, setSelectedVote] = useState<"skip" | "stay" | null>(
    null
  );
  const [prevCounts, setPrevCounts] = useState(counts);
  const [popSkip, setPopSkip] = useState(false);
  const [popStay, setPopStay] = useState(false);
  const [showExtension, setShowExtension] = useState(false);

  // Detect count changes for pop animation
  useEffect(() => {
    if (counts.skip > prevCounts.skip) {
      setPopSkip(true);
      const t = setTimeout(() => setPopSkip(false), 200);
      return () => clearTimeout(t);
    }
  }, [counts.skip, prevCounts.skip]);

  useEffect(() => {
    if (counts.stay > prevCounts.stay) {
      setPopStay(true);
      const t = setTimeout(() => setPopStay(false), 200);
      return () => clearTimeout(t);
    }
  }, [counts.stay, prevCounts.stay]);

  useEffect(() => {
    setPrevCounts(counts);
  }, [counts]);

  // Detect extension event
  useEffect(() => {
    if (broadcast.status === "extended") {
      setShowExtension(true);
      onExtension?.();
      playExtensionSound();
      const t = setTimeout(() => setShowExtension(false), 1500);
      return () => clearTimeout(t);
    }
  }, [broadcast.status, broadcast.extensionsCount, onExtension, playExtensionSound]);

  const handleVote = useCallback(
    async (vote: "skip" | "stay") => {
      setSelectedVote(vote);
      await onVote(vote);
      toast.success("Vote recorded!", {
        description:
          vote === "stay" ? "You voted to keep watching" : "You voted to skip",
      });
      playVoteSound();
    },
    [onVote, playVoteSound]
  );

  const isVotingOpen =
    broadcast.status === "voting" || broadcast.status === "extended";
  const canVote = isVotingOpen && !hasVoted && !isSubmitting;
  const skipPercent =
    counts.total > 0 ? Math.round((counts.skip / counts.total) * 100) : 0;
  const stayPercent =
    counts.total > 0 ? Math.round((counts.stay / counts.total) * 100) : 0;

  const containerVariants = reduced
    ? undefined
    : ({
        hidden: { height: 0, opacity: 0 },
        visible: {
          height: "auto",
          opacity: 1,
          transition: { type: "spring" as const, stiffness: 300, damping: 30 },
        },
      } satisfies import("framer-motion").Variants);

  return (
    <div className="bg-surface-container rounded-2xl overflow-hidden relative">
      {/* Extension celebration text */}
      <AnimatePresence>
        {showExtension && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <span className="text-3xl font-headline font-black text-secondary animate-float-up drop-shadow-[0_0_20px_rgba(89,238,80,0.6)]">
              +10 MIN
            </span>
          </div>
        )}
      </AnimatePresence>

      {/* Stream info bar */}
      <div className="p-4 flex items-center gap-4">
        {broadcast.stream?.twitchAvatarUrl && (
          <img
            src={broadcast.stream.twitchAvatarUrl}
            alt=""
            className="w-10 h-10 rounded-lg"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-headline font-bold text-on-surface truncate">
            {broadcast.stream?.twitchDisplayName ??
              broadcast.stream?.twitchUsername}
          </p>
          <p className="text-xs text-on-surface-variant truncate">
            {broadcast.streamCategory ?? broadcast.stream?.category ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {broadcast.extensionsCount > 0 && (
            <span className="text-xs font-bold text-secondary bg-secondary-container/20 px-2 py-0.5 rounded-full">
              +{broadcast.extensionsCount * 10}min
            </span>
          )}
          <CountdownTimer endTime={broadcast.scheduledEndAt} />
        </div>
      </div>

      {/* Voting area */}
      <AnimatePresence>
        {isVotingOpen && (
          <motion.div
            initial={reduced ? undefined : "hidden"}
            animate="visible"
            exit={reduced ? undefined : "hidden"}
            variants={containerVariants}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Vote progress bar */}
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span>{counts.total} vote{counts.total !== 1 ? "s" : ""}</span>
                <span>&middot;</span>
                <span>
                  {counts.total < 5
                    ? `${5 - counts.total} more needed`
                    : "Quorum reached"}
                </span>
              </div>

              {/* Vote buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={reduced ? undefined : { scale: 0.95 }}
                  onClick={() => handleVote("skip")}
                  disabled={!canVote}
                  className={`flex-1 h-12 rounded-xl font-headline font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    selectedVote === "skip"
                      ? "bg-error/20 text-error shadow-[0_0_16px_rgba(255,110,132,0.4)] ring-1 ring-error/40"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-bright disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    thumb_down
                  </span>
                  SKIP
                  <span
                    className={`text-xs ${popSkip ? "animate-vote-pop" : ""}`}
                  >
                    ({counts.skip})
                  </span>
                  {counts.total >= 5 && (
                    <span className="text-[10px] text-on-surface-variant ml-1">
                      {skipPercent}%
                    </span>
                  )}
                </motion.button>

                <motion.button
                  whileTap={reduced ? undefined : { scale: 0.95 }}
                  onClick={() => handleVote("stay")}
                  disabled={!canVote}
                  className={`flex-1 h-12 rounded-xl font-headline font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    selectedVote === "stay"
                      ? "bg-secondary/20 text-secondary shadow-[0_0_16px_rgba(89,238,80,0.4)] ring-1 ring-secondary/40"
                      : "bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed hover:shadow-[0_0_20px_rgba(170,48,250,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    thumb_up
                  </span>
                  STAY
                  <span
                    className={`text-xs ${popStay ? "animate-vote-pop" : ""}`}
                  >
                    ({counts.stay})
                  </span>
                  {counts.total >= 5 && (
                    <span className="text-[10px] text-on-surface-variant ml-1">
                      {stayPercent}%
                    </span>
                  )}
                </motion.button>
              </div>

              {hasVoted && (
                <p className="text-xs text-on-surface-variant text-center">
                  Your vote has been recorded
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
