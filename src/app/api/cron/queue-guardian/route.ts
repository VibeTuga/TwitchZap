// Queue Guardian Cron — Layer 1 of Stream Liveness Detection
// Register as: GET /api/cron/queue-guardian
// Schedule: every 5 minutes via cron-job.org
// Auth: Authorization: Bearer {CRON_SECRET}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { queue, streams } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getStreamInfo } from "@/lib/twitch/api";

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (
      !cronSecret ||
      !authHeader ||
      authHeader !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query top 5 waiting queue entries with stream info
    const waitingEntries = await db
      .select({
        queueId: queue.id,
        twitchUsername: streams.twitchUsername,
      })
      .from(queue)
      .leftJoin(streams, eq(queue.streamId, streams.id))
      .where(eq(queue.status, "waiting"))
      .orderBy(asc(queue.position))
      .limit(5);

    const removed: string[] = [];

    for (const entry of waitingEntries) {
      if (!entry.twitchUsername) {
        // Stream data missing — cancel
        await db
          .update(queue)
          .set({ status: "cancelled" })
          .where(eq(queue.id, entry.queueId));
        removed.push("unknown");
        continue;
      }

      const streamInfo = await getStreamInfo(entry.twitchUsername);

      if (!streamInfo) {
        // Stream is offline — cancel
        await db
          .update(queue)
          .set({ status: "cancelled" })
          .where(eq(queue.id, entry.queueId));
        console.log(`[queue-guardian] Removed offline stream: ${entry.twitchUsername}`);
        removed.push(entry.twitchUsername);
      }
    }

    return NextResponse.json({
      checked: waitingEntries.length,
      removed,
    });
  } catch (error) {
    console.error("[queue-guardian] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
