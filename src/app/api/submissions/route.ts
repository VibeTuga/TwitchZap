import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getStreamInfo, getUserInfo } from "@/lib/twitch/api";
import { addToQueue } from "@/lib/queue";
import { db } from "@/db";
import { streams, queue, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkAndAwardBadges } from "@/lib/badges";
import { isValidTwitchUsername } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { twitch_username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const twitchUsername = body.twitch_username?.trim().toLowerCase();
  if (!twitchUsername) {
    return NextResponse.json(
      { error: "twitch_username is required" },
      { status: 400 }
    );
  }

  if (!isValidTwitchUsername(twitchUsername)) {
    return NextResponse.json(
      { error: "Invalid Twitch username format" },
      { status: 400 }
    );
  }

  // Verify stream is live
  const streamInfo = await getStreamInfo(twitchUsername);
  if (!streamInfo) {
    return NextResponse.json(
      { error: "This stream isn't live right now" },
      { status: 400 }
    );
  }

  // Get user/channel metadata
  const userInfo = await getUserInfo(twitchUsername);
  if (!userInfo) {
    return NextResponse.json(
      { error: "Channel not found on Twitch" },
      { status: 400 }
    );
  }

  // Check if channel is in cooldown
  const [existingStream] = await db
    .select()
    .from(streams)
    .where(eq(streams.twitchChannelId, userInfo.id))
    .limit(1);

  if (existingStream?.lastBroadcastAt) {
    const lastBroadcast = new Date(existingStream.lastBroadcastAt).getTime();
    const cooldownMs =
      parseFloat(existingStream.cooldownHours) * 60 * 60 * 1000;
    const cooldownEnd = lastBroadcast + cooldownMs;

    if (Date.now() < cooldownEnd) {
      const remainingMs = cooldownEnd - Date.now();
      const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
      const remainingMinutes = Math.floor(
        (remainingMs % (60 * 60 * 1000)) / (60 * 1000)
      );

      return NextResponse.json(
        {
          error: "Stream is in cooldown",
          remaining_hours: remainingHours,
          remaining_minutes: remainingMinutes,
        },
        { status: 409 }
      );
    }
  }

  // Check if already in queue with status 'waiting'
  if (existingStream) {
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
      return NextResponse.json(
        {
          error: "Already in queue",
          queue_position: existingQueueEntry.position,
        },
        { status: 409 }
      );
    }
  }

  // Upsert stream record
  const [stream] = await db
    .insert(streams)
    .values({
      twitchChannelId: userInfo.id,
      twitchUsername: userInfo.login,
      twitchDisplayName: userInfo.display_name,
      twitchAvatarUrl: userInfo.profile_image_url,
      category: streamInfo.game_name || null,
    })
    .onConflictDoUpdate({
      target: streams.twitchChannelId,
      set: {
        twitchUsername: userInfo.login,
        twitchDisplayName: userInfo.display_name,
        twitchAvatarUrl: userInfo.profile_image_url,
        category: streamInfo.game_name || null,
        updatedAt: sql`NOW()`,
      },
    })
    .returning();

  // Add to queue
  const queueEntry = await addToQueue(stream.id, user.profile.id);

  // Increment user's streams_submitted count
  await db
    .update(users)
    .set({
      streamsSubmitted: sql`${users.streamsSubmitted} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(users.id, user.profile.id));

  // Check for new badges
  const newBadges = await checkAndAwardBadges(user.profile.id);

  return NextResponse.json({
    success: true,
    queue_position: queueEntry.position,
    stream: {
      id: stream.id,
      twitch_username: stream.twitchUsername,
      twitch_display_name: stream.twitchDisplayName,
      twitch_avatar_url: stream.twitchAvatarUrl,
      category: stream.category,
      viewer_count: streamInfo.viewer_count,
      title: streamInfo.title,
    },
    new_badges: newBadges,
  });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
