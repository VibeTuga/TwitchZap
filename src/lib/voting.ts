import { db } from "@/db";
import { votes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const QUORUM = 5;
const SKIP_THRESHOLD = 0.66;
const STAY_THRESHOLD = 0.5;

export type VoteResult = "skip" | "stay" | "no_quorum" | "no_action";

export interface TallyResult {
  result: VoteResult;
  skip_count: number;
  stay_count: number;
  total: number;
}

export async function tallyVotes(
  broadcastId: string,
  extensionRound: number
): Promise<TallyResult> {
  const rows = await db
    .select({
      vote: votes.vote,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(votes)
    .where(
      and(
        eq(votes.broadcastId, broadcastId),
        eq(votes.extensionRound, extensionRound)
      )
    )
    .groupBy(votes.vote);

  const skip_count = rows.find((r) => r.vote === "skip")?.count ?? 0;
  const stay_count = rows.find((r) => r.vote === "stay")?.count ?? 0;
  const total = skip_count + stay_count;

  if (total < QUORUM) {
    return { result: "no_quorum", skip_count, stay_count, total };
  }

  const skipRatio = skip_count / total;
  if (skipRatio >= SKIP_THRESHOLD) {
    return { result: "skip", skip_count, stay_count, total };
  }

  const stayRatio = stay_count / total;
  if (stayRatio > STAY_THRESHOLD) {
    return { result: "stay", skip_count, stay_count, total };
  }

  return { result: "no_action", skip_count, stay_count, total };
}

export async function canVote(
  broadcastId: string,
  userId: string,
  extensionRound: number
): Promise<boolean> {
  const [existing] = await db
    .select({ id: votes.id })
    .from(votes)
    .where(
      and(
        eq(votes.broadcastId, broadcastId),
        eq(votes.userId, userId),
        eq(votes.extensionRound, extensionRound)
      )
    )
    .limit(1);

  return !existing;
}
