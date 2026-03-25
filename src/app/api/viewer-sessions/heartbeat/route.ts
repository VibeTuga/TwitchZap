import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/db";
import { viewerSessions, broadcasts, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { awardPoints } from "@/lib/points";
import { checkAndAwardBadges } from "@/lib/badges";
import { isValidUUID } from "@/lib/validation";

const HEARTBEAT_SECONDS = 60;

export async function POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { broadcast_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { broadcast_id } = body;
  if (!broadcast_id || !isValidUUID(broadcast_id)) {
    return NextResponse.json(
      { error: "Valid broadcast_id is required" },
      { status: 400 }
    );
  }

  // Verify broadcast is active
  const [broadcast] = await db
    .select({ id: broadcasts.id, status: broadcasts.status })
    .from(broadcasts)
    .where(eq(broadcasts.id, broadcast_id))
    .limit(1);

  if (
    !broadcast ||
    !["live", "voting", "extended"].includes(broadcast.status)
  ) {
    return NextResponse.json(
      { error: "No active broadcast" },
      { status: 400 }
    );
  }

  // Upsert viewer session
  const [existing] = await db
    .select({
      id: viewerSessions.id,
      watchSeconds: viewerSessions.watchSeconds,
      pointsAwarded: viewerSessions.pointsAwarded,
    })
    .from(viewerSessions)
    .where(
      and(
        eq(viewerSessions.broadcastId, broadcast_id),
        eq(viewerSessions.userId, user.profile.id)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing session
    const newWatchSeconds = existing.watchSeconds + HEARTBEAT_SECONDS;
    const newTotalMinutes = Math.floor(newWatchSeconds / 60);
    const minutesSinceLastAward = newTotalMinutes - existing.pointsAwarded;

    await db
      .update(viewerSessions)
      .set({ watchSeconds: newWatchSeconds })
      .where(eq(viewerSessions.id, existing.id));

    // Award points for new full minutes
    if (minutesSinceLastAward > 0) {
      await awardPoints(
        user.profile.id,
        minutesSinceLastAward,
        "watching",
        broadcast_id
      );

      await db
        .update(users)
        .set({
          watchMinutes: sql`${users.watchMinutes} + ${minutesSinceLastAward}`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(users.id, user.profile.id));

      await db
        .update(viewerSessions)
        .set({ pointsAwarded: newTotalMinutes })
        .where(eq(viewerSessions.id, existing.id));
    }

    // Check for new badges after watch time updates
    const newBadges = await checkAndAwardBadges(user.profile.id);

    return NextResponse.json({
      success: true,
      watch_seconds: newWatchSeconds,
      points_awarded: minutesSinceLastAward > 0 ? minutesSinceLastAward : 0,
      new_badges: newBadges,
    });
  }

  // Create new session
  await db.insert(viewerSessions).values({
    broadcastId: broadcast_id,
    userId: user.profile.id,
    watchSeconds: HEARTBEAT_SECONDS,
    pointsAwarded: 0,
  });

  return NextResponse.json({
    success: true,
    watch_seconds: HEARTBEAT_SECONDS,
    points_awarded: 0,
    new_badges: [],
  });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
