"use client";

interface BadgeData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  pointsReward: number;
}

interface EarnedBadgeData {
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
}

interface BadgeDisplayProps {
  allBadges: BadgeData[];
  earnedBadges: EarnedBadgeData[];
  userStats?: {
    streamsSubmitted: number;
    votesCast: number;
    watchMinutes: number;
    totalPointsEarned: number;
  };
  className?: string;
}

const categoryLabels: Record<string, string> = {
  discovery: "Discovery",
  engagement: "Engagement",
  milestone: "Milestone",
  special: "Special",
};

const requirementLabels: Record<string, string> = {
  streams_submitted: "streams submitted",
  votes_cast: "votes cast",
  watch_minutes: "minutes watched",
  total_points_earned: "points earned",
  extensions_earned: "extensions earned",
  extensions_earned_max: "max extensions",
};

function getProgress(
  badge: BadgeData,
  userStats?: BadgeDisplayProps["userStats"]
): number | null {
  if (!userStats) return null;

  const statsMap: Record<string, number> = {
    streams_submitted: userStats.streamsSubmitted,
    votes_cast: userStats.votesCast,
    watch_minutes: userStats.watchMinutes,
    total_points_earned: userStats.totalPointsEarned,
  };

  const current = statsMap[badge.requirementType];
  if (current === undefined) return null;

  return Math.min(1, current / badge.requirementValue);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BadgeDisplay({
  allBadges,
  earnedBadges,
  userStats,
  className = "",
}: BadgeDisplayProps) {
  const earnedIds = new Set(earnedBadges.map((b) => b.badgeId));

  // Group by category
  const categories = Array.from(new Set(allBadges.map((b) => b.category)));

  return (
    <div className={`space-y-6 ${className}`}>
      {categories.map((category) => {
        const categoryBadges = allBadges.filter(
          (b) => b.category === category
        );
        if (categoryBadges.length === 0) return null;

        return (
          <div key={category}>
            <h4 className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              {categoryLabels[category] ?? category}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categoryBadges.map((badge) => {
                const isEarned = earnedIds.has(badge.id);
                const earned = earnedBadges.find(
                  (e) => e.badgeId === badge.id
                );
                const progress = isEarned
                  ? 1
                  : getProgress(badge, userStats);

                return (
                  <div
                    key={badge.id}
                    className={`relative p-4 rounded-2xl text-center transition-all ${
                      isEarned
                        ? "bg-primary-dim/15 ring-1 ring-primary-dim/30 shadow-[0_0_20px_rgba(170,48,250,0.1)]"
                        : "bg-surface-container opacity-60"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                        isEarned
                          ? "bg-primary-dim/20"
                          : "bg-surface-container-high"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-xl ${
                          isEarned
                            ? "text-primary"
                            : "text-on-surface-variant"
                        }`}
                      >
                        {isEarned ? badge.icon : "lock"}
                      </span>
                    </div>

                    {/* Name */}
                    <p
                      className={`text-xs font-headline font-bold truncate ${
                        isEarned ? "text-on-surface" : "text-on-surface-variant"
                      }`}
                    >
                      {badge.name}
                    </p>

                    {/* Description / Earned date */}
                    <p className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-2">
                      {isEarned && earned
                        ? `Earned ${formatDate(earned.earnedAt)}`
                        : badge.description}
                    </p>

                    {/* Progress bar for unearned */}
                    {!isEarned && progress !== null && (
                      <div className="mt-2">
                        <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-dim/50 rounded-full transition-all"
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                          {Math.round(progress * 100)}%
                        </p>
                      </div>
                    )}

                    {/* Requirement hint for unearned */}
                    {!isEarned && progress === null && (
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        {badge.requirementValue}{" "}
                        {requirementLabels[badge.requirementType] ??
                          badge.requirementType}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
