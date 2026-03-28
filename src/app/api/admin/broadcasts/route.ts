import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/db";
import { broadcasts, streams, queue } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { getStreamInfo } from "@/lib/twitch/api";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { action?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.action !== "end" && body.action !== "skip") {
      return NextResponse.json(
        { error: "action must be 'end' or 'skip'" },
        { status: 400 }
      );
    }

    // Find the active broadcast
    const [current] = await db
      .select()
      .from(broadcasts)
      .where(sql`${broadcasts.status} IN ('live', 'voting', 'extended')`)
      .limit(1);

    if (!current) {
      return NextResponse.json(
        { error: "No active broadcast" },
        { status: 404 }
      );
    }

    // End the current broadcast
    await db
      .update(broadcasts)
      .set({
        status: "completed",
        actualEndAt: sql`NOW()`,
      })
      .where(eq(broadcasts.id, current.id));

    // Update stream stats
    await db
      .update(streams)
      .set({
        lastBroadcastAt: sql`NOW()`,
        timesFeatured: sql`${streams.timesFeatured} + 1`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(streams.id, current.streamId));

    // Complete queue entry
    await db
      .update(queue)
      .set({ status: "completed", completedAt: sql`NOW()` })
      .where(eq(queue.id, current.queueEntryId));

    // For 'skip': also start the next live stream
    if (body.action === "skip") {
      const nextStream = await getNextLiveStream();

      if (nextStream) {
        const startedAt = new Date();
        const scheduledEndAt = new Date(
          startedAt.getTime() + 15 * 60 * 1000
        );
        const votingOpensAt = new Date(
          startedAt.getTime() + 10 * 60 * 1000
        );

        const [newBroadcast] = await db
          .insert(broadcasts)
          .values({
            queueEntryId: nextStream.queueId,
            streamId: nextStream.streamId,
            submittedBy: nextStream.submittedBy,
            startedAt: startedAt.toISOString(),
            scheduledEndAt: scheduledEndAt.toISOString(),
            votingOpensAt: votingOpensAt.toISOString(),
            status: "live",
            votingResult: "pending",
            streamTitle: nextStream.streamTitle,
            streamCategory: nextStream.streamCategory,
            streamViewerCount: nextStream.viewerCount,
          })
          .returning();

        await db
          .update(queue)
          .set({ status: "playing", startedAt: sql`NOW()` })
          .where(eq(queue.id, nextStream.queueId));

        return NextResponse.json({
          success: true,
          ended_broadcast_id: current.id,
          new_broadcast_id: newBroadcast.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      ended_broadcast_id: current.id,
    });
  } catch (err) {
    console.error("POST /api/admin/broadcasts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getNextLiveStream(): Promise<{
  queueId: string;
  streamId: string;
  submittedBy: string | null;
  twitchUsername: string;
  twitchDisplayName: string | null;
  streamTitle: string;
  streamCategory: string;
  viewerCount: number;
} | null> {
  const waitingEntries = await db
    .select({
      queueId: queue.id,
      streamId: queue.streamId,
      submittedBy: queue.submittedBy,
      twitchUsername: streams.twitchUsername,
      twitchDisplayName: streams.twitchDisplayName,
    })
    .from(queue)
    .leftJoin(streams, eq(queue.streamId, streams.id))
    .where(eq(queue.status, "waiting"))
    .orderBy(asc(queue.position));

  for (const entry of waitingEntries) {
    if (!entry.twitchUsername) {
      await db
        .update(queue)
        .set({ status: "skipped_offline" })
        .where(eq(queue.id, entry.queueId));
      continue;
    }

    const streamInfo = await getStreamInfo(entry.twitchUsername);

    if (!streamInfo) {
      await db
        .update(queue)
        .set({ status: "skipped_offline" })
        .where(eq(queue.id, entry.queueId));
      continue;
    }

    return {
      queueId: entry.queueId,
      streamId: entry.streamId,
      submittedBy: entry.submittedBy,
      twitchUsername: entry.twitchUsername,
      twitchDisplayName: entry.twitchDisplayName,
      streamTitle: streamInfo.title,
      streamCategory: streamInfo.game_name,
      viewerCount: streamInfo.viewer_count,
    };
  }

  return null;
}
