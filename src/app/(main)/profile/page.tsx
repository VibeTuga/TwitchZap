import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import { eq, desc, and } from "drizzle-orm";
import { ProfileContent } from "./ProfileContent";

export const metadata: Metadata = {
  title: "My Profile",
};

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const userId = user.profile.id;

  const [allBadges, earnedBadges, transactions, submissions, userVotes] =
    await Promise.all([
      db.select().from(badges).orderBy(badges.category, badges.name),

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

      db
        .select()
        .from(pointTransactions)
        .where(eq(pointTransactions.userId, userId))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(50),

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

  // Vote accuracy
  const stayVotes = userVotes.filter((v) => v.vote === "stay");
  const accurateStayVotes = stayVotes.filter(
    (v) => v.broadcastExtensions > 0 || v.broadcastVotingResult === "stay"
  );
  const voteAccuracy =
    stayVotes.length > 0
      ? Math.round((accurateStayVotes.length / stayVotes.length) * 100)
      : null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <ProfileContent
        user={{
          twitchDisplayName: user.profile.twitchDisplayName,
          twitchUsername: user.profile.twitchUsername,
          twitchAvatarUrl: user.profile.twitchAvatarUrl,
          zapPoints: user.profile.zapPoints,
          totalPointsEarned: user.profile.totalPointsEarned,
          streamsSubmitted: user.profile.streamsSubmitted,
          votesCast: user.profile.votesCast,
          watchMinutes: user.profile.watchMinutes,
          role: user.profile.role,
          createdAt: user.profile.createdAt,
        }}
        allBadges={allBadges}
        earnedBadges={earnedBadges}
        transactions={transactions}
        submissions={submissions}
        votes={userVotes}
        voteAccuracy={voteAccuracy}
      />
    </div>
  );
}
