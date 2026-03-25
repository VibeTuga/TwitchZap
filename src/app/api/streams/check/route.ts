import { NextRequest, NextResponse } from "next/server";
import { getStreamInfo, getUserInfo } from "@/lib/twitch/api";
import { db } from "@/db";
import { streams, queue } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidTwitchUsername } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase();

  if (!username) {
    return NextResponse.json(
      { error: "username is required" },
      { status: 400 }
    );
  }

  if (!isValidTwitchUsername(username)) {
    return NextResponse.json(
      { error: "Invalid username format" },
      { status: 400 }
    );
  }

  const userInfo = await getUserInfo(username);
  if (!userInfo) {
    return NextResponse.json(
      { error: "Channel not found on Twitch", status: "not_found" },
      { status: 404 }
    );
  }

  const streamInfo = await getStreamInfo(username);

  // Check existing stream record
  const [existingStream] = await db
    .select()
    .from(streams)
    .where(eq(streams.twitchChannelId, userInfo.id))
    .limit(1);

  let checkStatus: "live" | "offline" | "cooldown" | "in_queue" = streamInfo
    ? "live"
    : "offline";
  let cooldownRemaining: { hours: number; minutes: number } | null = null;
  let queuePosition: number | null = null;

  if (existingStream) {
    // Check cooldown
    if (existingStream.lastBroadcastAt) {
      const lastBroadcast = new Date(existingStream.lastBroadcastAt).getTime();
      const cooldownMs =
        parseFloat(existingStream.cooldownHours) * 60 * 60 * 1000;
      const cooldownEnd = lastBroadcast + cooldownMs;

      if (Date.now() < cooldownEnd) {
        const remainingMs = cooldownEnd - Date.now();
        checkStatus = "cooldown";
        cooldownRemaining = {
          hours: Math.floor(remainingMs / (60 * 60 * 1000)),
          minutes: Math.floor(
            (remainingMs % (60 * 60 * 1000)) / (60 * 1000)
          ),
        };
      }
    }

    // Check if in queue
    if (checkStatus !== "cooldown") {
      const [existingQueueEntry] = await db
        .select()
        .from(queue)
        .where(
          and(
            eq(queue.streamId, existingStream.id),
            eq(queue.status, "waiting")
          )
        )
        .limit(1);

      if (existingQueueEntry) {
        checkStatus = "in_queue";
        queuePosition = existingQueueEntry.position;
      }
    }
  }

  return NextResponse.json({
    status: checkStatus,
    channel: {
      id: userInfo.id,
      login: userInfo.login,
      display_name: userInfo.display_name,
      profile_image_url: userInfo.profile_image_url,
    },
    stream: streamInfo
      ? {
          title: streamInfo.title,
          game_name: streamInfo.game_name,
          viewer_count: streamInfo.viewer_count,
        }
      : null,
    cooldown_remaining: cooldownRemaining,
    queue_position: queuePosition,
    stream_id: existingStream?.id ?? null,
  });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
