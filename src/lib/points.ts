import { db } from "@/db";
import {
  users,
  pointTransactions,
  viewerSessions,
} from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function awardPoints(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<number> {
  const [user] = await db
    .select({ zapPoints: users.zapPoints })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const newBalance = user.zapPoints + amount;

  await db
    .update(users)
    .set({
      zapPoints: newBalance,
      totalPointsEarned:
        amount > 0
          ? sql`${users.totalPointsEarned} + ${amount}`
          : users.totalPointsEarned,
      updatedAt: sql`NOW()`,
    })
    .where(eq(users.id, userId));

  await db.insert(pointTransactions).values({
    userId,
    amount,
    reason,
    referenceId: referenceId ?? null,
    balanceAfter: newBalance,
  });

  return newBalance;
}

export async function spendPoints(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<{ success: true; newBalance: number } | { success: false; error: string }> {
  const [user] = await db
    .select({ zapPoints: users.zapPoints })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (user.zapPoints < amount) {
    return {
      success: false,
      error: `Insufficient points. Have ${user.zapPoints}, need ${amount}`,
    };
  }

  const newBalance = user.zapPoints - amount;

  await db
    .update(users)
    .set({
      zapPoints: newBalance,
      updatedAt: sql`NOW()`,
    })
    .where(eq(users.id, userId));

  await db.insert(pointTransactions).values({
    userId,
    amount: -amount,
    reason,
    referenceId: referenceId ?? null,
    balanceAfter: newBalance,
  });

  return { success: true, newBalance };
}

export async function awardWatchTimePoints(
  broadcastId: string
): Promise<void> {
  // Get all active viewer sessions for this broadcast
  const sessions = await db
    .select({
      id: viewerSessions.id,
      userId: viewerSessions.userId,
      watchSeconds: viewerSessions.watchSeconds,
      pointsAwarded: viewerSessions.pointsAwarded,
    })
    .from(viewerSessions)
    .where(
      and(
        eq(viewerSessions.broadcastId, broadcastId),
        sql`${viewerSessions.leftAt} IS NULL`
      )
    );

  for (const session of sessions) {
    const totalMinutes = Math.floor(session.watchSeconds / 60);
    const minutesSinceLastAward = totalMinutes - session.pointsAwarded;

    if (minutesSinceLastAward <= 0) continue;

    await awardPoints(
      session.userId,
      minutesSinceLastAward,
      "watching",
      broadcastId
    );

    // Update watch_minutes on user
    await db
      .update(users)
      .set({
        watchMinutes: sql`${users.watchMinutes} + ${minutesSinceLastAward}`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(users.id, session.userId));

    // Update points_awarded on session
    await db
      .update(viewerSessions)
      .set({ pointsAwarded: totalMinutes })
      .where(eq(viewerSessions.id, session.id));
  }
}
