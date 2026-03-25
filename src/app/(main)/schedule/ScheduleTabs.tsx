"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface QueueEntry {
  id: string;
  position: number;
  status: string;
  submittedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  stream: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
    category: string | null;
    twitchChannelId: string;
  } | null;
  submittedBy: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
  } | null;
}

interface BroadcastEntry {
  id: string;
  startedAt: string;
  actualEndAt: string | null;
  scheduledEndAt: string;
  status: string;
  votingResult: string | null;
  peakViewers: number | null;
  extensionsCount: number;
  streamTitle: string | null;
  streamCategory: string | null;
  stream: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
    category: string | null;
  } | null;
  submittedBy: {
    id: string;
    twitchUsername: string;
    twitchDisplayName: string | null;
    twitchAvatarUrl: string | null;
  } | null;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60000);
  return `${minutes} min`;
}

function VoteResultBadge({ result }: { result: string | null }) {
  switch (result) {
    case "skip":
      return (
        <span className="text-xs font-bold text-error bg-error-container/20 px-2 py-0.5 rounded-full">
          Skipped
        </span>
      );
    case "stay":
      return (
        <span className="text-xs font-bold text-secondary bg-secondary-container/20 px-2 py-0.5 rounded-full">
          Extended
        </span>
      );
    case "no_quorum":
      return (
        <span className="text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded-full">
          Completed
        </span>
      );
    default:
      return (
        <span className="text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded-full">
          Completed
        </span>
      );
  }
}

export function ScheduleTabs({
  queueEntries,
  recentBroadcasts,
  activeBroadcastId,
  currentUserId,
  currentUserPoints,
}: {
  queueEntries: QueueEntry[];
  recentBroadcasts: BroadcastEntry[];
  activeBroadcastId: string | null;
  currentUserId: string | null;
  currentUserPoints: number;
}) {
  const reduced = useReducedMotion();
  const router = useRouter();
  const [boostingId, setBoostingId] = useState<string | null>(null);

  async function handleBoost(entryId: string) {
    setBoostingId(entryId);
    try {
      const res = await fetch("/api/boosts/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue_entry_id: entryId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to boost");
        return;
      }
      toast.success(`Boosted to position #${data.new_position}!`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBoostingId(null);
    }
  }

  return (
    <Tabs defaultValue="upcoming">
      <TabsList className="bg-surface-container-high rounded-xl p-1 w-full">
        <TabsTrigger
          value="upcoming"
          className="flex-1 rounded-lg text-sm font-headline font-bold data-active:bg-surface-bright data-active:text-on-surface text-on-surface-variant"
        >
          UPCOMING
        </TabsTrigger>
        <TabsTrigger
          value="recent"
          className="flex-1 rounded-lg text-sm font-headline font-bold data-active:bg-surface-bright data-active:text-on-surface text-on-surface-variant"
        >
          RECENTLY AIRED
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="mt-4 space-y-3">
        {queueEntries.length === 0 ? (
          <EmptyQueueState />
        ) : (
          <AnimatePresence mode="popLayout">
            {queueEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                layoutId={reduced ? undefined : entry.id}
                initial={reduced ? undefined : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -10 }}
                transition={reduced ? undefined : { type: "spring", stiffness: 300, damping: 30 }}
              >
                <QueueCard
                  entry={entry}
                  isFirst={index === 0}
                  hasActiveBroadcast={!!activeBroadcastId}
                  canBoost={
                    entry.submittedBy?.id === currentUserId &&
                    entry.position > 1 &&
                    currentUserPoints >= 200
                  }
                  boosting={boostingId === entry.id}
                  onBoost={() => handleBoost(entry.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </TabsContent>

      <TabsContent value="recent" className="mt-4 space-y-3">
        {recentBroadcasts.length === 0 ? (
          <EmptyState
            icon="history"
            title="No recent broadcasts"
            description="Broadcasts will appear here once streams start airing."
          />
        ) : (
          recentBroadcasts.map((broadcast) => (
            <BroadcastCard key={broadcast.id} broadcast={broadcast} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

function QueueCard({
  entry,
  isFirst,
  hasActiveBroadcast,
  canBoost,
  boosting,
  onBoost,
}: {
  entry: QueueEntry;
  isFirst: boolean;
  hasActiveBroadcast: boolean;
  canBoost: boolean;
  boosting: boolean;
  onBoost: () => void;
}) {
  const isNowPlaying = isFirst && hasActiveBroadcast;

  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-colors ${
        isNowPlaying
          ? "bg-primary-dim/10 ring-1 ring-primary-dim/30"
          : "bg-surface-container-high hover:bg-surface-bright"
      }`}
    >
      {/* Position */}
      <div className="w-6 sm:w-8 text-center shrink-0">
        {isNowPlaying ? (
          <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest">
            LIVE
          </span>
        ) : (
          <span className="text-base sm:text-lg font-headline font-bold text-on-surface-variant">
            #{entry.position}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg shrink-0">
        <AvatarImage
          src={entry.stream?.twitchAvatarUrl ?? undefined}
          alt={entry.stream?.twitchDisplayName ?? ""}
        />
        <AvatarFallback className="bg-surface-variant text-on-surface-variant rounded-lg text-sm">
          {entry.stream?.twitchDisplayName?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-headline font-bold text-on-surface truncate">
            {entry.stream?.twitchDisplayName ?? entry.stream?.twitchUsername}
          </span>
          {entry.stream?.category && (
            <span className="text-xs text-on-surface-variant truncate hidden sm:inline">
              &middot; {entry.stream.category}
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Submitted by{" "}
          <span className="text-on-surface">
            {entry.submittedBy?.twitchDisplayName ??
              entry.submittedBy?.twitchUsername ??
              "Unknown"}
          </span>{" "}
          &middot; {timeAgo(entry.submittedAt)}
        </p>
      </div>

      {/* Now Playing indicator */}
      {isNowPlaying && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <span className="text-xs font-bold text-primary uppercase hidden sm:inline">
            NOW PLAYING
          </span>
        </div>
      )}

      {/* Boost button */}
      {canBoost && !isNowPlaying && (
        <button
          onClick={onBoost}
          disabled={boosting}
          className="bg-primary/20 text-primary text-xs font-bold rounded-lg px-2 py-1 hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
        >
          {boosting ? (
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm">bolt</span>
          )}
          200 ZP
        </button>
      )}
    </div>
  );
}

function BroadcastCard({ broadcast }: { broadcast: BroadcastEntry }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-high hover:bg-surface-bright transition-colors">
      {/* Avatar */}
      <Avatar className="h-10 w-10 rounded-lg shrink-0">
        <AvatarImage
          src={broadcast.stream?.twitchAvatarUrl ?? undefined}
          alt={broadcast.stream?.twitchDisplayName ?? ""}
        />
        <AvatarFallback className="bg-surface-variant text-on-surface-variant rounded-lg text-sm">
          {broadcast.stream?.twitchDisplayName?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-headline font-bold text-on-surface truncate">
            {broadcast.stream?.twitchDisplayName ??
              broadcast.stream?.twitchUsername}
          </span>
          {(broadcast.streamCategory || broadcast.stream?.category) && (
            <span className="text-xs text-on-surface-variant truncate hidden sm:inline">
              &middot;{" "}
              {broadcast.streamCategory ?? broadcast.stream?.category}
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Aired {timeAgo(broadcast.startedAt)} &middot;{" "}
          {getDuration(broadcast.startedAt, broadcast.actualEndAt)}
          {broadcast.peakViewers != null && broadcast.peakViewers > 0 && (
            <span> &middot; {broadcast.peakViewers} peak viewers</span>
          )}
        </p>
      </div>

      {/* Vote Result */}
      <div className="shrink-0">
        <VoteResultBadge result={broadcast.votingResult} />
      </div>
    </div>
  );
}

function EmptyQueueState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-dim/20 flex items-center justify-center mb-4">
        <span
          className="material-symbols-outlined text-primary-dim text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          queue
        </span>
      </div>
      <h3 className="text-base font-headline font-bold text-on-surface">
        No streams in queue yet
      </h3>
      <p className="text-sm text-on-surface-variant mt-1 mb-4">
        Be the first to submit!
      </p>
      <Link
        href="/submit"
        className="inline-flex h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed font-headline font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(170,48,250,0.4)] items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-base">publish</span>
        Submit a Stream
      </Link>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-variant/50 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-on-surface-variant text-2xl">
          {icon}
        </span>
      </div>
      <h3 className="text-base font-headline font-bold text-on-surface">
        {title}
      </h3>
      <p className="text-sm text-on-surface-variant mt-1">{description}</p>
    </div>
  );
}
