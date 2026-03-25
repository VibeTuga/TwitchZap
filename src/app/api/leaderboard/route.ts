import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/db";
import { users, pointTransactions, votes } from "@/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

type LeaderboardType = "points" | "submissions" | "votes";
type Period = "week" | "month" | "all";

const LEADERBOARD_LIMIT = 50;

function getPeriodStart(period: Period): Date | null {
  if (period === "all") return null;

  const now = new Date();
  if (period === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  // month
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "points") as LeaderboardType;
  const period = (searchParams.get("period") ?? "all") as Period;

  if (!["points", "submissions", "votes"].includes(type)) {
    return NextResponse.json(
      { error: "type must be points, submissions, or votes" },
      { status: 400 }
    );
  }

  if (!["week", "month", "all"].includes(period)) {
    return NextResponse.json(
      { error: "period must be week, month, or all" },
      { status: 400 }
    );
  }

  const periodStart = getPeriodStart(period);
  const currentUser = await getUser();

  let rankings: {
    user: {
      id: string;
      twitch_username: string;
      twitch_display_name: string | null;
      twitch_avatar_url: string | null;
    };
    value: number;
    rank: number;
  }[];

  if (period === "all") {
    // Use denormalized columns for all-time queries
    const orderColumn =
      type === "points"
        ? users.totalPointsEarned
        : type === "submissions"
          ? users.streamsSubmitted
          : users.votesCast;

    const rows = await db
      .select({
        id: users.id,
        twitchUsername: users.twitchUsername,
        twitchDisplayName: users.twitchDisplayName,
        twitchAvatarUrl: users.twitchAvatarUrl,
        value: orderColumn,
      })
      .from(users)
      .orderBy(desc(orderColumn))
      .limit(LEADERBOARD_LIMIT);

    rankings = rows.map((row, idx) => ({
      user: {
        id: row.id,
        twitch_username: row.twitchUsername,
        twitch_display_name: row.twitchDisplayName,
        twitch_avatar_url: row.twitchAvatarUrl,
      },
      value: row.value,
      rank: idx + 1,
    }));
  } else {
    // Period-filtered queries
    if (type === "points") {
      const rows = await db
        .select({
          id: users.id,
          twitchUsername: users.twitchUsername,
          twitchDisplayName: users.twitchDisplayName,
          twitchAvatarUrl: users.twitchAvatarUrl,
          value: sql<number>`COALESCE(SUM(${pointTransactions.amount}) FILTER (WHERE ${pointTransactions.amount} > 0), 0)`,
        })
        .from(users)
        .leftJoin(
          pointTransactions,
          and(
            eq(pointTransactions.userId, users.id),
            periodStart
              ? gte(pointTransactions.createdAt, periodStart.toISOString())
              : undefined
          )
        )
        .groupBy(
          users.id,
          users.twitchUsername,
          users.twitchDisplayName,
          users.twitchAvatarUrl
        )
        .orderBy(
          desc(
            sql`COALESCE(SUM(${pointTransactions.amount}) FILTER (WHERE ${pointTransactions.amount} > 0), 0)`
          )
        )
        .limit(LEADERBOARD_LIMIT);

      rankings = rows.map((row, idx) => ({
        user: {
          id: row.id,
          twitch_username: row.twitchUsername,
          twitch_display_name: row.twitchDisplayName,
          twitch_avatar_url: row.twitchAvatarUrl,
        },
        value: Number(row.value),
        rank: idx + 1,
      }));
    } else {
      // votes or submissions — count from the respective tables
      const rows = await db
        .select({
          id: users.id,
          twitchUsername: users.twitchUsername,
          twitchDisplayName: users.twitchDisplayName,
          twitchAvatarUrl: users.twitchAvatarUrl,
          value: sql<number>`COUNT(${votes.id})`,
        })
        .from(users)
        .leftJoin(
          votes,
          and(
            eq(votes.userId, users.id),
            periodStart
              ? gte(votes.votedAt, periodStart.toISOString())
              : undefined
          )
        )
        .groupBy(
          users.id,
          users.twitchUsername,
          users.twitchDisplayName,
          users.twitchAvatarUrl
        )
        .orderBy(desc(sql`COUNT(${votes.id})`))
        .limit(LEADERBOARD_LIMIT);

      rankings = rows.map((row, idx) => ({
        user: {
          id: row.id,
          twitch_username: row.twitchUsername,
          twitch_display_name: row.twitchDisplayName,
          twitch_avatar_url: row.twitchAvatarUrl,
        },
        value: Number(row.value),
        rank: idx + 1,
      }));
    }
  }

  // Get requesting user's rank
  let userRank: { rank: number; value: number } | null = null;

  if (currentUser) {
    const userInRankings = rankings.find(
      (r) => r.user.id === currentUser.profile.id
    );
    if (userInRankings) {
      userRank = { rank: userInRankings.rank, value: userInRankings.value };
    } else {
      // User not in top 50 — calculate their rank
      if (period === "all") {
        const orderColumn =
          type === "points"
            ? users.totalPointsEarned
            : type === "submissions"
              ? users.streamsSubmitted
              : users.votesCast;

        const userValue =
          currentUser.profile[
            type === "points"
              ? "totalPointsEarned"
              : type === "submissions"
                ? "streamsSubmitted"
                : "votesCast"
          ];

        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(sql`${orderColumn} > ${userValue}`);

        userRank = {
          rank: Number(countResult?.count ?? 0) + 1,
          value: userValue,
        };
      }
    }
  }

  return NextResponse.json({ rankings, user_rank: userRank });
}
