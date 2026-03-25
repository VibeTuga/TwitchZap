"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useBroadcast } from "@/hooks/useBroadcast";
import { useVoting } from "@/hooks/useVoting";
import { useWatchTime } from "@/hooks/useWatchTime";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { UpNext } from "@/components/UpNext";
import { ActivityFeed } from "@/components/ActivityFeed";

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

function useElapsedTime(startedAt: string | null) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startedAt) {
      setElapsed("");
      return;
    }

    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime();
      if (ms < 0) {
        setElapsed("0m");
        return;
      }
      const totalMins = Math.floor(ms / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setElapsed(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}

export default function LiveViewPage() {
  const { broadcast, loading, isReconnecting } = useBroadcast();
  const { counts, hasVoted, isSubmitting, castVote, setHasVoted } = useVoting(
    broadcast?.id ?? null
  );
  const [showConfetti, setShowConfetti] = useState(false);
  const [hostname, setHostname] = useState("localhost");
  const timeAired = useElapsedTime(broadcast?.startedAt ?? null);

  useWatchTime(broadcast?.id ?? null);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

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
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-9 space-y-4">
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
          <div className="bg-surface-container rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="col-span-12 xl:col-span-3">
          <Skeleton className="h-[300px] xl:h-[calc(100vh-120px)] rounded-[1.5rem]" />
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

  const streamerName =
    broadcast.stream?.twitchDisplayName ?? broadcast.stream?.twitchUsername ?? "Unknown";
  const submitterName =
    broadcast.submitter?.twitchDisplayName ?? broadcast.submitter?.twitchUsername;
  const channelUsername = broadcast.stream?.twitchUsername;

  return (
    <div className="grid grid-cols-12 gap-6">
      <Confetti active={showConfetti} />

      {/* Main Content — Left Column */}
      <div className="col-span-12 xl:col-span-9 space-y-4">
        {/* Stream Player */}
        <ErrorBoundary fallbackMessage="Stream player unavailable">
          <StreamPlayer
            channel={channelUsername ?? null}
            isReconnecting={isReconnecting}
            gracePeriodExpiresAt={broadcast?.gracePeriodExpiresAt}
          />
        </ErrorBoundary>

        {/* Voting Panel */}
        <div className="px-4 md:px-0">
          <ErrorBoundary fallbackMessage="Voting temporarily unavailable">
            <VotingPanel
              broadcast={broadcast}
              onVote={castVote}
              hasVoted={hasVoted}
              isSubmitting={isSubmitting}
              counts={counts}
              onExtension={handleExtension}
            />
          </ErrorBoundary>
        </div>

        {/* Stream Info Card */}
        <div className="px-4 md:px-0">
          <div className="bg-surface-container rounded-2xl p-6">
            <div className="flex items-start gap-4">
              {/* Streamer Avatar */}
              {broadcast.stream?.twitchAvatarUrl ? (
                <Image
                  src={broadcast.stream.twitchAvatarUrl}
                  alt={streamerName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-xl shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-2xl">
                    person
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-headline font-bold text-on-surface truncate">
                  {streamerName}
                </h3>
                {broadcast.stream?.category && (
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {broadcast.stream.category}
                  </p>
                )}
                {broadcast.submitter && (
                  <div className="flex items-center gap-2 mt-2">
                    {broadcast.submitter.twitchAvatarUrl ? (
                      <Image
                        src={broadcast.submitter.twitchAvatarUrl}
                        alt={submitterName ?? ""}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : null}
                    <p className="text-xs text-on-surface-variant">
                      Submitted by{" "}
                      <span className="text-primary font-bold">
                        {submitterName}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Open on Twitch */}
              {channelUsername && (
                <a
                  href={`https://twitch.tv/${channelUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9146FF]/20 hover:bg-[#9146FF]/40 text-[11px] font-bold text-white tracking-wide transition-all border border-[#9146FF]/40"
                >
                  <span className="material-symbols-outlined text-[#bf94ff] text-sm">
                    open_in_new
                  </span>
                  <span className="hidden sm:inline">Open on Twitch</span>
                </a>
              )}
            </div>

            {/* Broadcast Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-surface-container-high p-4 rounded-xl">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  Time Aired
                </p>
                <p className="text-xl font-headline font-bold text-on-surface">
                  {timeAired || "0m"}
                </p>
              </div>
              <div className="bg-surface-container-high p-4 rounded-xl">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  Total Zap Votes
                </p>
                <p className="text-xl font-headline font-bold text-secondary">
                  {counts.total.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-container-high p-4 rounded-xl">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  Extensions
                </p>
                <p className="text-xl font-headline font-bold text-tertiary">
                  {broadcast.extensionsCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Up Next Section */}
        <div className="px-4 md:px-0">
          <ErrorBoundary fallbackMessage="Up next unavailable">
            <UpNext />
          </ErrorBoundary>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="col-span-12 xl:col-span-3 xl:sticky xl:top-24 xl:h-[calc(100vh-120px)] flex flex-col gap-6">
        {/* Twitch Chat */}
        <ErrorBoundary fallbackMessage="Chat unavailable">
          <div className="twitch-chat-gradient rounded-[1.5rem] flex flex-col overflow-hidden shadow-2xl h-[300px] xl:h-auto xl:flex-[3]">
            <div className="p-4 bg-[#1f1f23]/50 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#bf94ff]">
                  chat
                </span>
                <h4 className="text-xs font-black uppercase tracking-widest text-on-surface">
                  Stream Chat
                </h4>
              </div>
            </div>
            {channelUsername ? (
              <iframe
                src={`https://www.twitch.tv/embed/${channelUsername}/chat?parent=${hostname}&darkpopout`}
                className="flex-1 w-full border-0"
                title="Twitch Chat"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
                Chat unavailable
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* Activity Feed — hidden on mobile */}
        <div className="hidden xl:block">
          <ErrorBoundary fallbackMessage="Activity feed unavailable">
            <ActivityFeed />
          </ErrorBoundary>
        </div>
      </aside>
    </div>
  );
}
