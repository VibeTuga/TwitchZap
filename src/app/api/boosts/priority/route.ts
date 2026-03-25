import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { spendPoints } from "@/lib/points";
import { db } from "@/db";
import { queue } from "@/db/schema";
import { eq, and, sql, lt, gte } from "drizzle-orm";
import { isValidUUID } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500, limit: 10 });

const PRIORITY_BOOST_COST = 200;
const POSITIONS_TO_MOVE = 3;

export async function POST(request: NextRequest) {
  try {
  const ip = getClientIp(request);
  try { limiter.check(ip); } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { queue_entry_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { queue_entry_id } = body;
  if (!queue_entry_id || !isValidUUID(queue_entry_id)) {
    return NextResponse.json(
      { error: "Valid queue_entry_id is required" },
      { status: 400 }
    );
  }

  // Check user has enough points
  if (user.profile.zapPoints < PRIORITY_BOOST_COST) {
    return NextResponse.json(
      {
        error: `Insufficient points. Need ${PRIORITY_BOOST_COST}, have ${user.profile.zapPoints}`,
      },
      { status: 400 }
    );
  }

  // Fetch the queue entry
  const [entry] = await db
    .select()
    .from(queue)
    .where(eq(queue.id, queue_entry_id))
    .limit(1);

  if (!entry) {
    return NextResponse.json(
      { error: "Queue entry not found" },
      { status: 404 }
    );
  }

  if (entry.submittedBy !== user.profile.id) {
    return NextResponse.json(
      { error: "You can only boost your own queue entries" },
      { status: 403 }
    );
  }

  if (entry.status !== "waiting") {
    return NextResponse.json(
      { error: "Can only boost entries with 'waiting' status" },
      { status: 400 }
    );
  }

  // Calculate new position (move up by POSITIONS_TO_MOVE, minimum position 1)
  const newPosition = Math.max(1, entry.position - POSITIONS_TO_MOVE);

  if (newPosition >= entry.position) {
    return NextResponse.json(
      { error: "Entry is already at the top of the queue" },
      { status: 400 }
    );
  }

  // Spend points
  const spendResult = await spendPoints(
    user.profile.id,
    PRIORITY_BOOST_COST,
    "queue_priority",
    queue_entry_id
  );

  if (!spendResult.success) {
    return NextResponse.json({ error: spendResult.error }, { status: 400 });
  }

  // Move affected entries down by 1 (entries between newPosition and current position)
  await db
    .update(queue)
    .set({
      position: sql`${queue.position} + 1`,
    })
    .where(
      and(
        eq(queue.status, "waiting"),
        gte(queue.position, newPosition),
        lt(queue.position, entry.position)
      )
    );

  // Move boosted entry to new position
  await db
    .update(queue)
    .set({ position: newPosition })
    .where(eq(queue.id, queue_entry_id));

  return NextResponse.json({
    success: true,
    points_spent: PRIORITY_BOOST_COST,
    old_position: entry.position,
    new_position: newPosition,
  });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
