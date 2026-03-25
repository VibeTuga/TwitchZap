import { db } from "@/db";
import { badges, userBadges, users, broadcasts } from "@/db/schema";
import { eq, sql, and, notInArray } from "drizzle-orm";
import { awardPoints } from "@/lib/points";

interface EarnedBadge {
  badgeId: string;
  slug: string;
  name: string;
  icon: string;
  pointsReward: number;
}

export async function checkAndAwardBadges(
  userId: string
): Promise<EarnedBadge[]> {
  // Get user stats
  const [user] = await db
    .select({
      streamsSubmitted: users.streamsSubmitted,
      votesCast: users.votesCast,
      watchMinutes: users.watchMinutes,
      totalPointsEarned: users.totalPointsEarned,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return [];

  // Get already earned badge IDs
  const earnedBadgeIds = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  const earnedIds = earnedBadgeIds.map((b) => b.badgeId);

  // Get all badges not yet earned
  const unearnedBadges =
    earnedIds.length > 0
      ? await db
          .select()
          .from(badges)
          .where(notInArray(badges.id, earnedIds))
      : await db.select().from(badges);

  // Get extension stats for event-based badges
  let extensionsEarned = 0;
  let extensionsMaxEarned = 0;

  const hasExtensionBadges = unearnedBadges.some(
    (b) =>
      b.requirementType === "extensions_earned" ||
      b.requirementType === "extensions_earned_max"
  );

  if (hasExtensionBadges) {
    const [extStats] = await db
      .select({
        extensionsEarned:
          sql<number>`COUNT(*) FILTER (WHERE ${broadcasts.extensionsCount} >= 1)`,
        extensionsMaxEarned:
          sql<number>`COUNT(*) FILTER (WHERE ${broadcasts.extensionsCount} >= ${broadcasts.maxExtensions})`,
      })
      .from(broadcasts)
      .where(
        and(
          eq(broadcasts.submittedBy, userId),
          sql`${broadcasts.status} IN ('completed', 'skipped', 'extended')`
        )
      );

    extensionsEarned = Number(extStats?.extensionsEarned ?? 0);
    extensionsMaxEarned = Number(extStats?.extensionsMaxEarned ?? 0);
  }

  // Build stats map
  const statsMap: Record<string, number> = {
    streams_submitted: user.streamsSubmitted,
    votes_cast: user.votesCast,
    watch_minutes: user.watchMinutes,
    total_points_earned: user.totalPointsEarned,
    extensions_earned: extensionsEarned,
    extensions_earned_max: extensionsMaxEarned,
  };

  const newlyEarned: EarnedBadge[] = [];

  for (const badge of unearnedBadges) {
    const userValue = statsMap[badge.requirementType] ?? 0;

    if (userValue >= badge.requirementValue) {
      // Award the badge
      await db.insert(userBadges).values({
        userId,
        badgeId: badge.id,
      });

      // Award points reward if any
      if (badge.pointsReward > 0) {
        await awardPoints(userId, badge.pointsReward, "badge_reward", badge.id);
      }

      newlyEarned.push({
        badgeId: badge.id,
        slug: badge.slug,
        name: badge.name,
        icon: badge.icon,
        pointsReward: badge.pointsReward,
      });
    }
  }

  return newlyEarned;
}
