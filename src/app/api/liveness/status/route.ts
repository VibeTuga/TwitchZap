import { NextResponse } from "next/server";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
  const [broadcast] = await db
    .select({
      id: broadcasts.id,
      status: broadcasts.status,
      offlineDetectedAt: broadcasts.offlineDetectedAt,
      offlineDetectionMethod: broadcasts.offlineDetectionMethod,
      gracePeriodExpiresAt: broadcasts.gracePeriodExpiresAt,
      offlineReporters: broadcasts.offlineReporters,
      recoveryCount: broadcasts.recoveryCount,
    })
    .from(broadcasts)
    .where(
      sql`${broadcasts.status} IN ('live', 'voting', 'extended')`
    )
    .limit(1);

  if (!broadcast) {
    return NextResponse.json({ broadcast: null, liveness: "no_broadcast" });
  }

  let liveness: "online" | "reconnecting" | "offline" = "online";

  if (broadcast.gracePeriodExpiresAt) {
    const graceExpiry = new Date(broadcast.gracePeriodExpiresAt);
    if (new Date() >= graceExpiry) {
      liveness = "offline";
    } else {
      liveness = "reconnecting";
    }
  } else if (broadcast.offlineDetectedAt) {
    liveness = "reconnecting";
  }

  return NextResponse.json({
    broadcast_id: broadcast.id,
    liveness,
    offline_detected_at: broadcast.offlineDetectedAt,
    grace_period_expires_at: broadcast.gracePeriodExpiresAt,
    recovery_count: broadcast.recoveryCount,
    reporter_count: Array.isArray(broadcast.offlineReporters)
      ? broadcast.offlineReporters.length
      : 0,
  });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
