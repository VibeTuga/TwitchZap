import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { spendPoints } from "@/lib/points";
import { isInCooldown, calculateCooldown } from "@/lib/cooldown";
import { db } from "@/db";
import { cooldownBoosts, streams } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { isValidUUID } from "@/lib/validation";

const COOLDOWN_BOOST_COST = 100;
const COOLDOWN_BOOST_HOURS = 2;
const MIN_COOLDOWN_HOURS = 4;

export async function POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { stream_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { stream_id } = body;
  if (!stream_id || !isValidUUID(stream_id)) {
    return NextResponse.json(
      { error: "Valid stream_id is required" },
      { status: 400 }
    );
  }

  // Check user has enough points
  if (user.profile.zapPoints < COOLDOWN_BOOST_COST) {
    return NextResponse.json(
      {
        error: `Insufficient points. Need ${COOLDOWN_BOOST_COST}, have ${user.profile.zapPoints}`,
      },
      { status: 400 }
    );
  }

  // Check stream is actually in cooldown
  const cooldownStatus = await isInCooldown(stream_id);
  if (!cooldownStatus.inCooldown) {
    return NextResponse.json(
      { error: "Stream is not in cooldown" },
      { status: 409 }
    );
  }

  // Check if reducing would go below minimum
  if (cooldownStatus.effectiveCooldownHours <= MIN_COOLDOWN_HOURS) {
    return NextResponse.json(
      { error: "Cooldown is already at minimum" },
      { status: 409 }
    );
  }

  // Spend points
  const spendResult = await spendPoints(
    user.profile.id,
    COOLDOWN_BOOST_COST,
    "cooldown_boost",
    stream_id
  );

  if (!spendResult.success) {
    return NextResponse.json({ error: spendResult.error }, { status: 400 });
  }

  // Insert cooldown boost record
  await db.insert(cooldownBoosts).values({
    streamId: stream_id,
    userId: user.profile.id,
    boostType: "zap_points",
    hoursReduced: COOLDOWN_BOOST_HOURS.toFixed(2),
    pointsSpent: COOLDOWN_BOOST_COST,
  });

  // Recalculate effective cooldown
  const newCooldownHours = await calculateCooldown(stream_id);

  await db
    .update(streams)
    .set({
      cooldownHours: newCooldownHours.toFixed(2),
      updatedAt: sql`NOW()`,
    })
    .where(eq(streams.id, stream_id));

  return NextResponse.json({
    success: true,
    points_spent: COOLDOWN_BOOST_COST,
    new_cooldown_hours: newCooldownHours,
  });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
