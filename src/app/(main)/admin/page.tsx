import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  broadcasts,
  votes,
  pointTransactions,
  queue,
  streams,
} from "@/db/schema";
import { count, sum, eq, inArray, desc, gt } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default async function AdminPage() {
  const user = await getUser();
  if (!user || user.profile.role !== "admin") {
    redirect("/");
  }

  const [
    totalUsersResult,
    totalBroadcastsResult,
    totalVotesResult,
    totalPointsResult,
    totalWatchMinutesResult,
    queueDepthResult,
    recentBroadcasts,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),

    db
      .select({ value: count() })
      .from(broadcasts)
      .where(
        inArray(broadcasts.status, ["completed", "skipped", "ended_offline"])
      ),

    db.select({ value: count() }).from(votes),

    db
      .select({ value: sum(pointTransactions.amount) })
      .from(pointTransactions)
      .where(gt(pointTransactions.amount, 0)),

    db.select({ value: sum(users.watchMinutes) }).from(users),

    db
      .select({ value: count() })
      .from(queue)
      .where(eq(queue.status, "waiting")),

    db
      .select({
        id: broadcasts.id,
        status: broadcasts.status,
        startedAt: broadcasts.startedAt,
        actualEndAt: broadcasts.actualEndAt,
        extensionsCount: broadcasts.extensionsCount,
        peakViewers: broadcasts.peakViewers,
        totalVotes: broadcasts.totalVotes,
        votingResult: broadcasts.votingResult,
        streamName: streams.twitchDisplayName,
        streamUsername: streams.twitchUsername,
        streamCategory: streams.category,
      })
      .from(broadcasts)
      .innerJoin(streams, eq(broadcasts.streamId, streams.id))
      .orderBy(desc(broadcasts.startedAt))
      .limit(10),
  ]);

  const totalUsers = totalUsersResult[0]?.value ?? 0;
  const totalBroadcastsCount = totalBroadcastsResult[0]?.value ?? 0;
  const totalVotesCount = totalVotesResult[0]?.value ?? 0;
  const totalPoints = Number(totalPointsResult[0]?.value ?? 0);
  const totalWatchMins = Number(totalWatchMinutesResult[0]?.value ?? 0);
  const queueDepth = queueDepthResult[0]?.value ?? 0;

  const stats = [
    {
      icon: "group",
      label: "Total Users",
      value: totalUsers.toLocaleString(),
    },
    {
      icon: "live_tv",
      label: "Broadcasts Completed",
      value: totalBroadcastsCount.toLocaleString(),
    },
    {
      icon: "how_to_vote",
      label: "Total Votes Cast",
      value: totalVotesCount.toLocaleString(),
    },
    {
      icon: "bolt",
      label: "Zap Points Distributed",
      value: totalPoints.toLocaleString(),
    },
    {
      icon: "schedule",
      label: "Total Watch Minutes",
      value: totalWatchMins.toLocaleString(),
    },
    {
      icon: "queue",
      label: "Current Queue Depth",
      value: queueDepth.toLocaleString(),
    },
  ];

  const statusColors: Record<string, string> = {
    completed: "text-green-400",
    skipped: "text-amber-400",
    ended_offline: "text-red-400",
    live: "text-cyan-400",
    voting: "text-purple-400",
    extended: "text-blue-400",
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-headline font-black text-on-surface tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-on-surface-variant mt-2">
          Platform statistics and recent activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container rounded-2xl p-5 flex items-start gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-primary-dim/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-dim text-xl">
                {stat.icon}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-on-surface-variant">{stat.label}</p>
              <p className="text-2xl font-bold text-on-surface mt-0.5">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Broadcasts */}
      <div className="bg-surface-container rounded-2xl p-5">
        <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-dim text-xl">
            history
          </span>
          Recent Broadcasts
        </h2>

        {recentBroadcasts.length === 0 ? (
          <p className="text-on-surface-variant text-sm py-4 text-center">
            No broadcasts yet
          </p>
        ) : (
          <div className="space-y-2">
            {recentBroadcasts.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/50 hover:bg-surface-container-high transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {b.streamName || b.streamUsername}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {b.streamCategory || "Unknown category"}
                    {" · "}
                    {new Date(b.startedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  {b.peakViewers != null && (
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        visibility
                      </span>
                      {b.peakViewers}
                    </span>
                  )}
                  {b.totalVotes != null && (
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        how_to_vote
                      </span>
                      {b.totalVotes}
                    </span>
                  )}
                  {b.extensionsCount > 0 && (
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        add_circle
                      </span>
                      +{b.extensionsCount}
                    </span>
                  )}
                  <span
                    className={`font-semibold capitalize ${statusColors[b.status] || "text-on-surface-variant"}`}
                  >
                    {b.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
