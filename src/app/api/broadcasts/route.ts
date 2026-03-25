import { NextResponse } from "next/server";
import { db } from "@/db";
import { broadcasts, streams, queue, users, votes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/auth";

export async function GET() {
  // Get current live broadcast
  const [broadcast] = await db
    .select({
      id: broadcasts.id,
      queueEntryId: broadcasts.queueEntryId,
      streamId: broadcasts.streamId,
      submittedBy: broadcasts.submittedBy,
      startedAt: broadcasts.startedAt,
      scheduledEndAt: broadcasts.scheduledEndAt,
      actualEndAt: broadcasts.actualEndAt,
      baseDurationMinutes: broadcasts.baseDurationMinutes,
      extensionsCount: broadcasts.extensionsCount,
      maxExtensions: broadcasts.maxExtensions,
      status: broadcasts.status,
      votingOpensAt: broadcasts.votingOpensAt,
      votingResult: broadcasts.votingResult,
      totalViewers: broadcasts.totalViewers,
      peakViewers: broadcasts.peakViewers,
      totalVotes: broadcasts.totalVotes,
      skipVotes: broadcasts.skipVotes,
      stayVotes: broadcasts.stayVotes,
      streamTitle: broadcasts.streamTitle,
      streamCategory: broadcasts.streamCategory,
      streamViewerCount: broadcasts.streamViewerCount,
      offlineDetectedAt: broadcasts.offlineDetectedAt,
      gracePeriodExpiresAt: broadcasts.gracePeriodExpiresAt,
      recoveryCount: broadcasts.recoveryCount,
      stream: {
        id: streams.id,
        twitchUsername: streams.twitchUsername,
        twitchDisplayName: streams.twitchDisplayName,
        twitchAvatarUrl: streams.twitchAvatarUrl,
        category: streams.category,
        twitchChannelId: streams.twitchChannelId,
      },
      submitter: {
        id: users.id,
        twitchUsername: users.twitchUsername,
        twitchDisplayName: users.twitchDisplayName,
        twitchAvatarUrl: users.twitchAvatarUrl,
      },
      queuePosition: queue.position,
    })
    .from(broadcasts)
    .leftJoin(streams, eq(broadcasts.streamId, streams.id))
    .leftJoin(users, eq(broadcasts.submittedBy, users.id))
    .leftJoin(queue, eq(broadcasts.queueEntryId, queue.id))
    .where(
      sql`${broadcasts.status} IN ('live', 'voting', 'extended')`
    )
    .orderBy(broadcasts.startedAt)
    .limit(1);

  if (!broadcast) {
    return NextResponse.json({ broadcast: null });
  }

  // Check if the requesting user has voted
  let hasVoted = false;
  const user = await getUser();
  if (user) {
    const [existingVote] = await db
      .select({ id: votes.id })
      .from(votes)
      .where(
        and(
          eq(votes.broadcastId, broadcast.id),
          eq(votes.userId, user.profile.id),
          eq(votes.extensionRound, broadcast.extensionsCount)
        )
      )
      .limit(1);

    hasVoted = !!existingVote;
  }

  return NextResponse.json({
    broadcast: {
      ...broadcast,
      has_voted: hasVoted,
    },
  });
}
