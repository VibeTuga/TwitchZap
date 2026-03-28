import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { isValidUUID, isValidLivenessStatus, validateOrigin } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500, limit: 30 });

export async function POST(request: NextRequest) {
  try {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  try { limiter.check(ip); } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { broadcast_id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { broadcast_id, status } = body;

  if (!broadcast_id || !status) {
    return NextResponse.json(
      { error: "broadcast_id and status are required" },
      { status: 400 }
    );
  }

  if (!isValidUUID(broadcast_id)) {
    return NextResponse.json(
      { error: "Invalid broadcast_id format" },
      { status: 400 }
    );
  }

  if (!isValidLivenessStatus(status)) {
    return NextResponse.json(
      { error: "status must be 'offline' or 'online'" },
      { status: 400 }
    );
  }

  // Fetch current broadcast
  const [broadcast] = await db
    .select()
    .from(broadcasts)
    .where(eq(broadcasts.id, broadcast_id))
    .limit(1);

  if (!broadcast) {
    return NextResponse.json(
      { error: "Broadcast not found" },
      { status: 404 }
    );
  }

  if (!["live", "voting", "extended"].includes(broadcast.status)) {
    return NextResponse.json(
      { error: "Broadcast is not active" },
      { status: 400 }
    );
  }

  if (status === "offline") {
    // Add reporter to offline_reporters (deduplicate)
    const reporters = (broadcast.offlineReporters as { user_id: string; reported_at: string }[]) || [];
    const alreadyReported = reporters.some(
      (r) => r.user_id === user.profile.id
    );

    if (!alreadyReported) {
      reporters.push({
        user_id: user.profile.id,
        reported_at: new Date().toISOString(),
      });
    }

    // Use reporter count as a proxy for viewer consensus
    // (without Supabase Presence, we use a fixed threshold of 3)
    const threshold = 3;
    const reportCount = reporters.length;
    const consensusReached = reportCount >= threshold;

    if (consensusReached && !broadcast.gracePeriodExpiresAt) {
      // Start grace period
      const gracePeriodExpires = new Date(Date.now() + 30 * 1000);

      await db
        .update(broadcasts)
        .set({
          offlineDetectedAt: sql`NOW()`,
          gracePeriodExpiresAt: gracePeriodExpires.toISOString(),
          offlineDetectionMethod: "viewer_consensus",
          offlineReporters: reporters,
        })
        .where(eq(broadcasts.id, broadcast_id));

      return NextResponse.json({
        success: true,
        consensus_reached: true,
        grace_period_started: true,
      });
    }

    // Update reporters even if consensus not reached
    await db
      .update(broadcasts)
      .set({ offlineReporters: reporters })
      .where(eq(broadcasts.id, broadcast_id));

    return NextResponse.json({
      success: true,
      consensus_reached: consensusReached,
      report_count: reportCount,
      threshold,
    });
  }

  // status === "online"
  if (broadcast.gracePeriodExpiresAt) {
    // Stream recovered during grace period
    await db
      .update(broadcasts)
      .set({
        offlineDetectedAt: null,
        gracePeriodExpiresAt: null,
        offlineReporters: [],
        recoveryCount: sql`${broadcasts.recoveryCount} + 1`,
      })
      .where(eq(broadcasts.id, broadcast_id));

    return NextResponse.json({
      success: true,
      recovered: true,
    });
  }

  return NextResponse.json({ success: true, recovered: false });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
