import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/db";
import {
  badges,
  userBadges,
  pointTransactions,
  queue,
  votes,
  broadcasts,
  streams,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.profile.id;

  // Fetch all data in parallel
  const [allBadges, earnedBadges, transactions, submissions, userVotes] =
    await Promise.all([
      // All available badges
      db.select().from(badges).orderBy(badges.category, badges.name),

      // User's earned badges with badge details
      db
        .select({
          id: userBadges.id,
          badgeId: userBadges.badgeId,
          earnedAt: userBadges.earnedAt,
          slug: badges.slug,
          name: badges.name,
          description: badges.description,
          icon: badges.icon,
          category: badges.category,
          requirementType: badges.requirementType,
          requirementValue: badges.requirementValue,
          pointsReward: badges.pointsReward,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.earnedAt)),

      // Recent point transactions (last 50)
      db
        .select()
        .from(pointTransactions)
        .where(eq(pointTransactions.userId, userId))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(50),

      // Submission history with broadcast outcomes
      db
        .select({
          id: queue.id,
          status: queue.status,
          submittedAt: queue.submittedAt,
          streamName: streams.twitchDisplayName,
          streamUsername: streams.twitchUsername,
          streamAvatar: streams.twitchAvatarUrl,
          streamCategory: streams.category,
          broadcastId: broadcasts.id,
          broadcastStatus: broadcasts.status,
          broadcastVotingResult: broadcasts.votingResult,
          broadcastExtensions: broadcasts.extensionsCount,
          broadcastPeakViewers: broadcasts.peakViewers,
          broadcastStartedAt: broadcasts.startedAt,
          broadcastActualEndAt: broadcasts.actualEndAt,
        })
        .from(queue)
        .innerJoin(streams, eq(queue.streamId, streams.id))
        .leftJoin(
          broadcasts,
          and(
            eq(broadcasts.queueEntryId, queue.id),
            eq(broadcasts.submittedBy, userId)
          )
        )
        .where(eq(queue.submittedBy, userId))
        .orderBy(desc(queue.submittedAt))
        .limit(50),

      // Vote history with broadcast outcomes
      db
        .select({
          id: votes.id,
          vote: votes.vote,
          extensionRound: votes.extensionRound,
          votedAt: votes.votedAt,
          broadcastId: votes.broadcastId,
          broadcastStatus: broadcasts.status,
          broadcastVotingResult: broadcasts.votingResult,
          broadcastExtensions: broadcasts.extensionsCount,
          streamName: streams.twitchDisplayName,
          streamUsername: streams.twitchUsername,
          streamAvatar: streams.twitchAvatarUrl,
        })
        .from(votes)
        .innerJoin(broadcasts, eq(votes.broadcastId, broadcasts.id))
        .innerJoin(streams, eq(broadcasts.streamId, streams.id))
        .where(eq(votes.userId, userId))
        .orderBy(desc(votes.votedAt))
        .limit(50),
    ]);

  // Calculate vote accuracy: % of stay votes on streams that got extended
  const stayVotes = userVotes.filter((v) => v.vote === "stay");
  const accurateStayVotes = stayVotes.filter(
    (v) =>
      v.broadcastExtensions > 0 ||
      v.broadcastVotingResult === "stay"
  );
  const voteAccuracy =
    stayVotes.length > 0
      ? Math.round((accurateStayVotes.length / stayVotes.length) * 100)
      : null;

  // Calculate points earned per submission
  const submissionsWithPoints = submissions.map((s) => {
    let pointsEarned = 10; // base submission points
    if (s.broadcastVotingResult === "stay") pointsEarned += 15; // extension bonus
    if (s.broadcastExtensions && s.broadcastExtensions >= 3)
      pointsEarned += 25; // max extension bonus
    return { ...s, pointsEarned: s.broadcastId ? pointsEarned : 0 };
  });

  return NextResponse.json({
    user: {
      id: user.profile.id,
      twitchUsername: user.profile.twitchUsername,
      twitchDisplayName: user.profile.twitchDisplayName,
      twitchAvatarUrl: user.profile.twitchAvatarUrl,
      zapPoints: user.profile.zapPoints,
      totalPointsEarned: user.profile.totalPointsEarned,
      streamsSubmitted: user.profile.streamsSubmitted,
      votesCast: user.profile.votesCast,
      watchMinutes: user.profile.watchMinutes,
      role: user.profile.role,
      createdAt: user.profile.createdAt,
    },
    allBadges,
    earnedBadges,
    transactions,
    submissions: submissionsWithPoints,
    votes: userVotes,
    voteAccuracy,
  });
}
