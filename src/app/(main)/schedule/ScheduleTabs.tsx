"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
}: {
  queueEntries: QueueEntry[];
  recentBroadcasts: BroadcastEntry[];
  activeBroadcastId: string | null;
}) {
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
          <EmptyState
            icon="queue"
            title="Queue is empty"
            description="No streams in the queue. Be the first to submit one!"
          />
        ) : (
          queueEntries.map((entry, index) => (
            <QueueCard
              key={entry.id}
              entry={entry}
              isFirst={index === 0}
              hasActiveBroadcast={!!activeBroadcastId}
            />
          ))
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
}: {
  entry: QueueEntry;
  isFirst: boolean;
  hasActiveBroadcast: boolean;
}) {
  const isNowPlaying = isFirst && hasActiveBroadcast;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
        isNowPlaying
          ? "bg-primary-dim/10 ring-1 ring-primary-dim/30"
          : "bg-surface-container-high hover:bg-surface-bright"
      }`}
    >
      {/* Position */}
      <div className="w-8 text-center shrink-0">
        {isNowPlaying ? (
          <span className="text-xs font-bold text-primary uppercase tracking-widest">
            LIVE
          </span>
        ) : (
          <span className="text-lg font-headline font-bold text-on-surface-variant">
            #{entry.position}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10 rounded-lg shrink-0">
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
          <span className="text-xs font-bold text-primary uppercase">
            NOW PLAYING
          </span>
        </div>
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
