"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useBroadcast } from "@/hooks/useBroadcast";
import { useVoting } from "@/hooks/useVoting";
import { usePresence } from "@/hooks/usePresence";
import { useWatchTime } from "@/hooks/useWatchTime";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton-card";

const StreamPlayer = dynamic(
  () =>
    import("@/components/StreamPlayer").then((mod) => mod.StreamPlayer),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full aspect-video md:rounded-2xl" />,
  }
);

const VotingPanel = dynamic(
  () =>
    import("@/components/VotingPanel").then((mod) => mod.VotingPanel),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
  }
);

const Confetti = dynamic(
  () => import("@/components/Confetti").then((mod) => mod.Confetti),
  { ssr: false }
);

export default function LiveViewPage() {
  const { broadcast, loading, isReconnecting } = useBroadcast();
  const { counts, hasVoted, isSubmitting, castVote, setHasVoted } = useVoting(
    broadcast?.id ?? null
  );
  const { viewerCount } = usePresence(broadcast?.id ?? null);
  const [showConfetti, setShowConfetti] = useState(false);

  useWatchTime(broadcast?.id ?? null);

  // Sync hasVoted from broadcast state
  if (broadcast?.has_voted && !hasVoted) {
    setHasVoted(true);
  }

  const handleExtension = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto -mx-4 md:mx-auto">
        <Skeleton className="w-full aspect-video md:rounded-2xl" />
        <div className="bg-surface-container rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // No broadcast — empty state
  if (!broadcast) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-primary-dim/20 flex items-center justify-center mx-auto">
            <span
              className="material-symbols-outlined text-primary-dim text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sensors
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-headline font-bold text-on-surface">
              No stream is playing right now
            </h2>
            <p className="text-on-surface-variant">
              Submit a stream to get things started!
            </p>
          </div>
          <Link
            href="/submit"
            className="inline-flex h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed font-headline font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(170,48,250,0.4)] items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">publish</span>
            Submit a Stream
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto -mx-4 md:mx-auto">
      <Confetti active={showConfetti} />

      {/* Stream Player — full-width on mobile */}
      <div className="lg:px-0">
        <StreamPlayer
          channel={broadcast.stream?.twitchUsername ?? null}
          isReconnecting={isReconnecting}
        />
      </div>

      {/* Viewer count */}
      <div className="flex items-center justify-between px-5 md:px-1">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <span>
            {viewerCount} viewer{viewerCount !== 1 ? "s" : ""}
          </span>
        </div>
        {broadcast.submitter && (
          <p className="text-xs text-on-surface-variant">
            Submitted by{" "}
            <span className="text-on-surface font-medium">
              {broadcast.submitter.twitchDisplayName ??
                broadcast.submitter.twitchUsername}
            </span>
          </p>
        )}
      </div>

      {/* Voting Panel */}
      <div className="px-4 md:px-0">
        <VotingPanel
          broadcast={broadcast}
          onVote={castVote}
          hasVoted={hasVoted}
          isSubmitting={isSubmitting}
          counts={counts}
          onExtension={handleExtension}
        />
      </div>
    </div>
  );
}
