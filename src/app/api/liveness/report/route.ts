import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
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

  if (status !== "offline" && status !== "online") {
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

  const supabase = createAdminClient();

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

    // Get viewer count from presence
    const presenceChannel = supabase.channel("viewers");
    const presenceState = presenceChannel.presenceState();
    const viewerCount = Object.keys(presenceState).length || 1;
    await supabase.removeChannel(presenceChannel);

    // Determine consensus threshold
    let threshold: number;
    if (viewerCount <= 1) {
      threshold = 1;
    } else if (viewerCount === 2) {
      threshold = 2;
    } else {
      threshold = 3;
    }

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

      await supabase.channel("broadcast-live").send({
        type: "broadcast",
        event: "stream_reconnecting",
        payload: {
          broadcast_id,
          grace_period_expires_at: gracePeriodExpires.toISOString(),
        },
      });

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

    await supabase.channel("broadcast-live").send({
      type: "broadcast",
      event: "stream_recovered",
      payload: { broadcast_id },
    });

    return NextResponse.json({
      success: true,
      recovered: true,
    });
  }

  return NextResponse.json({ success: true, recovered: false });
}
