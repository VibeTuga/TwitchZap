"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeDisplay } from "@/components/gamification/BadgeDisplay";

type LeaderboardType = "points" | "submissions" | "votes";
type Period = "week" | "month" | "all";

interface RankingEntry {
  user: {
    id: string;
    twitch_username: string;
    twitch_display_name: string | null;
    twitch_avatar_url: string | null;
  };
  value: number;
  rank: number;
}

interface UserRank {
  rank: number;
  value: number;
}

interface LeaderboardData {
  rankings: RankingEntry[];
  user_rank: UserRank | null;
}

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

const typeLabels: Record<LeaderboardType, { label: string; icon: string }> = {
  points: { label: "Top Points", icon: "bolt" },
  submissions: { label: "Top Submitters", icon: "upload" },
  votes: { label: "Top Voters", icon: "how_to_vote" },
};

const periodLabels: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

const rankMedals: Record<number, string> = {
  1: "\u{1F947}",
  2: "\u{1F948}",
  3: "\u{1F949}",
};

function getLevelTitle(points: number): string {
  if (points >= 10000) return "Legend";
  if (points >= 5000) return "Veteran";
  if (points >= 2000) return "Explorer";
  if (points >= 500) return "Scout";
  if (points >= 100) return "Newcomer";
  return "Rookie";
}

function getValueLabel(type: LeaderboardType): string {
  switch (type) {
    case "points":
      return "pts";
    case "submissions":
      return "submitted";
    case "votes":
      return "votes";
  }
}

export function LeaderboardContent({
  allBadges,
  earnedBadges,
  userStats,
}: {
  allBadges: BadgeData[];
  earnedBadges: EarnedBadgeData[];
  userStats: {
    streamsSubmitted: number;
    votesCast: number;
    watchMinutes: number;
    totalPointsEarned: number;
  } | null;
}) {
  const [type, setType] = useState<LeaderboardType>("points");
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?type=${type}&period=${period}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [type, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const userRank = data?.user_rank;

  return (
    <div className="space-y-8">
      {/* Your Rank Card */}
      {userRank && (
        <div className="bg-gradient-to-br from-primary-dim/20 to-primary-dim/5 rounded-[1.5rem] p-6">
          <p className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Your Rank
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-headline font-black text-on-surface">
                #{userRank.rank}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-dim text-lg">
                bolt
              </span>
              <span className="text-lg font-headline font-bold text-on-surface">
                {userRank.value.toLocaleString()}
              </span>
              <span className="text-sm text-on-surface-variant">
                {getValueLabel(type)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-lg">
                military_tech
              </span>
              <span className="text-sm font-bold text-on-surface">
                {earnedBadges.length} badges
              </span>
            </div>
            {userStats && (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-lg">
                  star
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {getLevelTitle(userStats.totalPointsEarned)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <Tabs
          value={type}
          onValueChange={(v) => setType(v as LeaderboardType)}
        >
          <TabsList className="bg-surface-container-high rounded-xl p-1 w-full">
            {(Object.keys(typeLabels) as LeaderboardType[]).map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="flex-1 rounded-lg text-sm font-headline font-bold data-active:bg-surface-bright data-active:text-on-surface text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-base mr-1.5 hidden sm:inline">
                  {typeLabels[t].icon}
                </span>
                {typeLabels[t].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Time Period Pills */}
        <div className="flex gap-2">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-headline font-bold transition-colors ${
                period === p
                  ? "bg-primary-dim/20 text-primary ring-1 ring-primary-dim/30"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings Table */}
      <div className="space-y-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-2xl animate-spin">
              progress_activity
            </span>
            <p className="text-sm text-on-surface-variant mt-2">
              Loading rankings...
            </p>
          </div>
        ) : !data?.rankings.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-variant/50 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">
                leaderboard
              </span>
            </div>
            <h3 className="text-base font-headline font-bold text-on-surface">
              No rankings yet
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Start watching, voting, and submitting to climb the leaderboard!
            </p>
          </div>
        ) : (
          data.rankings.map((entry) => {
            const isTopThree = entry.rank <= 3;
            const medal = rankMedals[entry.rank];

            return (
              <div
                key={entry.user.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                  isTopThree
                    ? "bg-surface-container-high"
                    : "bg-surface-container"
                }`}
              >
                {/* Rank */}
                <div className="w-10 text-center shrink-0">
                  {medal ? (
                    <span className="text-xl">{medal}</span>
                  ) : (
                    <span className="text-sm font-headline font-bold text-on-surface-variant">
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="h-9 w-9 rounded-full shrink-0">
                  <AvatarImage
                    src={entry.user.twitch_avatar_url ?? undefined}
                    alt={
                      entry.user.twitch_display_name ??
                      entry.user.twitch_username
                    }
                  />
                  <AvatarFallback className="bg-surface-variant text-on-surface-variant rounded-full text-sm">
                    {(
                      entry.user.twitch_display_name ??
                      entry.user.twitch_username
                    ).charAt(0)}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-headline font-bold truncate text-on-surface">
                    {entry.user.twitch_display_name ??
                      entry.user.twitch_username}
                  </span>
                </div>

                {/* Value */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-headline font-bold text-on-surface">
                    {entry.value.toLocaleString()}
                  </span>
                  {type === "points" && (
                    <span className="material-symbols-outlined text-primary-dim text-base">
                      bolt
                    </span>
                  )}
                  {type !== "points" && (
                    <span className="text-xs text-on-surface-variant">
                      {getValueLabel(type)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Badges Showcase */}
      <div className="bg-surface-container-low rounded-[1.5rem] p-6">
        <h2 className="text-xl font-headline font-black text-on-surface mb-4">
          Badges Showcase
        </h2>
        <BadgeDisplay
          allBadges={allBadges}
          earnedBadges={earnedBadges}
          userStats={userStats ?? undefined}
        />
      </div>
    </div>
  );
}
