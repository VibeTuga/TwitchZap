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
import { count, sum, eq, inArray, desc, gt, sql } from "drizzle-orm";
import { getQueue } from "@/lib/queue";
import {
  AdminQueueRemoveButton,
  AdminBroadcastActions,
  AdminUserRoleSelect,
} from "./AdminActions";

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
    waitingQueue,
    activeBroadcastResult,
    allUsersResult,
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

    getQueue("waiting"),

    db
      .select({
        id: broadcasts.id,
        status: broadcasts.status,
        startedAt: broadcasts.startedAt,
        scheduledEndAt: broadcasts.scheduledEndAt,
        extensionsCount: broadcasts.extensionsCount,
        streamName: streams.twitchDisplayName,
        streamUsername: streams.twitchUsername,
      })
      .from(broadcasts)
      .innerJoin(streams, eq(broadcasts.streamId, streams.id))
      .where(sql`${broadcasts.status} IN ('live', 'voting', 'extended')`)
      .limit(1),

    db
      .select({
        id: users.id,
        twitchUsername: users.twitchUsername,
        twitchDisplayName: users.twitchDisplayName,
        twitchAvatarUrl: users.twitchAvatarUrl,
        role: users.role,
        zapPoints: users.zapPoints,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
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

  const activeBroadcast = activeBroadcastResult[0] ?? null;

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/20 text-red-400",
    moderator: "bg-amber-500/20 text-amber-400",
    member: "bg-cyan-500/20 text-cyan-400",
  };

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
      {/* Queue Management */}
      <div className="bg-surface-container rounded-2xl p-5">
        <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-dim text-xl">
            queue
          </span>
          Queue Management
        </h2>

        {waitingQueue.length === 0 ? (
          <p className="text-on-surface-variant text-sm py-4 text-center">
            No streams in queue
          </p>
        ) : (
          <div className="space-y-2">
            {waitingQueue.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/50"
              >
                <span className="text-xs font-bold text-on-surface-variant w-8 text-center shrink-0">
                  #{entry.position}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {entry.stream?.twitchDisplayName ||
                      entry.stream?.twitchUsername ||
                      "Unknown"}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {entry.stream?.category || "No category"}
                    {" · submitted by "}
                    {entry.submittedBy?.twitchDisplayName ||
                      entry.submittedBy?.twitchUsername ||
                      "Unknown"}
                    {" · "}
                    {new Date(entry.submittedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <AdminQueueRemoveButton
                  queueEntryId={entry.id}
                  streamName={
                    entry.stream?.twitchDisplayName ||
                    entry.stream?.twitchUsername ||
                    "Unknown"
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Control */}
      <div className="bg-surface-container rounded-2xl p-5">
        <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-dim text-xl">
            live_tv
          </span>
          Broadcast Control
        </h2>

        {!activeBroadcast ? (
          <p className="text-on-surface-variant text-sm py-4 text-center">
            No active broadcast
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/50">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {activeBroadcast.streamName ||
                    activeBroadcast.streamUsername}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Status:{" "}
                  <span
                    className={`font-semibold capitalize ${statusColors[activeBroadcast.status] || "text-on-surface-variant"}`}
                  >
                    {activeBroadcast.status}
                  </span>
                  {" · "}
                  Ends{" "}
                  {new Date(activeBroadcast.scheduledEndAt).toLocaleTimeString(
                    "en-US",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                  {activeBroadcast.extensionsCount > 0 &&
                    ` · +${activeBroadcast.extensionsCount} ext`}
                </p>
              </div>
            </div>
            <AdminBroadcastActions
              broadcastId={activeBroadcast.id}
              streamName={
                activeBroadcast.streamName ||
                activeBroadcast.streamUsername
              }
            />
          </div>
        )}
      </div>

      {/* User Management */}
      <div className="bg-surface-container rounded-2xl p-5">
        <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-dim text-xl">
            group
          </span>
          User Management
        </h2>

        {allUsersResult.length === 0 ? (
          <p className="text-on-surface-variant text-sm py-4 text-center">
            No users yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-on-surface-variant">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium text-right">Zap Points</th>
                  <th className="pb-3 font-medium text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allUsersResult.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        {u.twitchAvatarUrl ? (
                          <img
                            src={u.twitchAvatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-surface-container-high shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant text-sm">
                              person
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-on-surface font-medium truncate text-sm">
                            {u.twitchDisplayName || u.twitchUsername}
                          </p>
                          {u.twitchDisplayName && u.twitchDisplayName !== u.twitchUsername && (
                            <p className="text-xs text-on-surface-variant truncate">
                              @{u.twitchUsername}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${roleColors[u.role] || "bg-white/10 text-on-surface-variant"}`}
                        >
                          {u.role}
                        </span>
                        <AdminUserRoleSelect
                          userId={u.id}
                          currentRole={u.role}
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right text-on-surface tabular-nums">
                      {u.zapPoints.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-on-surface-variant text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
