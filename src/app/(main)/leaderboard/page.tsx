import { getUser } from "@/lib/auth";
import { db } from "@/db";
import { badges, userBadges } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { LeaderboardContent } from "./LeaderboardContent";

export default async function LeaderboardPage() {
  const user = await getUser();

  // Fetch all badges for the showcase
  const allBadges = await db
    .select()
    .from(badges)
    .orderBy(badges.category, badges.name);

  // Fetch earned badges if logged in
  let earnedBadges: {
    id: string;
    badgeId: string;
    earnedAt: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    requirementType: string;
    requirementValue: number;
    pointsReward: number;
  }[] = [];

  let userStats: {
    streamsSubmitted: number;
    votesCast: number;
    watchMinutes: number;
    totalPointsEarned: number;
  } | null = null;

  if (user) {
    const earned = await db
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
      .where(eq(userBadges.userId, user.profile.id))
      .orderBy(desc(userBadges.earnedAt));

    earnedBadges = earned;

    userStats = {
      streamsSubmitted: user.profile.streamsSubmitted,
      votesCast: user.profile.votesCast,
      watchMinutes: user.profile.watchMinutes,
      totalPointsEarned: user.profile.totalPointsEarned,
    };
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-headline font-black text-on-surface tracking-tight">
          Community Leaderboard
        </h1>
        <p className="text-on-surface-variant mt-2">
          See who&apos;s making the biggest impact on TwitchZap
        </p>
      </div>

      <LeaderboardContent
        allBadges={allBadges}
        earnedBadges={earnedBadges}
        userStats={userStats}
      />
    </div>
  );
}
