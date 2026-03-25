import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { broadcasts, streams, queue } from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { tallyVotes } from "@/lib/voting";
import { applyCooldownReductions } from "@/lib/cooldown";
import { getStreamInfo } from "@/lib/twitch/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardPoints, awardWatchTimePoints } from "@/lib/points";
import { checkAndAwardBadges } from "@/lib/badges";

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

  const supabase = createAdminClient();
  const now = new Date();

  // (1) Query current broadcast
  const [current] = await db
    .select()
    .from(broadcasts)
    .where(
      sql`${broadcasts.status} IN ('live', 'voting', 'extended')`
    )
    .limit(1);

  // (3) Mid-broadcast status transition: live → voting
  if (current && current.votingOpensAt) {
    const votingOpensAt = new Date(current.votingOpensAt);
    if (now >= votingOpensAt && current.status === "live") {
      await db
        .update(broadcasts)
        .set({ status: "voting" })
        .where(eq(broadcasts.id, current.id));

      await supabase.channel("broadcast-live").send({
        type: "broadcast",
        event: "voting_open",
        payload: { broadcast_id: current.id },
      });
    }
  }

  // (2.5) Server-side liveness check for currently-playing broadcast
  if (current) {
    const [currentStream] = await db
      .select({ twitchUsername: streams.twitchUsername })
      .from(streams)
      .where(eq(streams.id, current.streamId))
      .limit(1);

    if (currentStream) {
      const streamInfo = await getStreamInfo(currentStream.twitchUsername);

      if (!streamInfo && !current.gracePeriodExpiresAt) {
        // Stream went offline — start grace period
        const gracePeriodExpiresAt = new Date(now.getTime() + 30_000);

        await db
          .update(broadcasts)
          .set({
            offlineDetectedAt: now.toISOString(),
            gracePeriodExpiresAt: gracePeriodExpiresAt.toISOString(),
            offlineDetectionMethod: "helix_api",
            offlineReporters: [],
          })
          .where(eq(broadcasts.id, current.id));

        await supabase.channel("broadcast-live").send({
          type: "broadcast",
          event: "stream_reconnecting",
          payload: {
            broadcast_id: current.id,
            grace_period_expires_at: gracePeriodExpiresAt.toISOString(),
          },
        });
      } else if (streamInfo && current.offlineDetectedAt) {
        // Stream recovered — clear offline state
        await db
          .update(broadcasts)
          .set({
            offlineDetectedAt: null,
            gracePeriodExpiresAt: null,
            offlineReporters: [],
            recoveryCount: sql`${broadcasts.recoveryCount} + 1`,
          })
          .where(eq(broadcasts.id, current.id));

        await supabase.channel("broadcast-live").send({
          type: "broadcast",
          event: "stream_recovered",
          payload: { broadcast_id: current.id },
        });
      }
    }
  }

  // (2) Check if current broadcast has expired
  let justEnded = false;

  if (current) {
    const scheduledEndAt = new Date(current.scheduledEndAt);

    // Check grace period expiry for offline streams
    if (current.gracePeriodExpiresAt) {
      const graceExpiry = new Date(current.gracePeriodExpiresAt);
      if (now >= graceExpiry && current.offlineDetectedAt) {
        // Grace period expired — end broadcast as offline
        await db
          .update(broadcasts)
          .set({
            status: "ended_offline",
            actualEndAt: sql`NOW()`,
          })
          .where(eq(broadcasts.id, current.id));

        // Reduced cooldown (50%) for offline ending
        await db
          .update(streams)
          .set({
            lastBroadcastAt: sql`NOW()`,
            cooldownHours: "10.00",
            updatedAt: sql`NOW()`,
          })
          .where(eq(streams.id, current.streamId));

        await db
          .update(queue)
          .set({ status: "completed", completedAt: sql`NOW()` })
          .where(eq(queue.id, current.queueEntryId));

        // Award watch-time points for offline-ended broadcast
        await awardWatchTimePoints(current.id);

        await supabase.channel("broadcast-live").send({
          type: "broadcast",
          event: "stream_ended",
          payload: { broadcast_id: current.id, reason: "offline" },
        });

        justEnded = true;
      }
    }

    // Check if scheduled end time has passed
    if (!justEnded && now >= scheduledEndAt) {
      const extensionRound = current.extensionsCount;
      const tally = await tallyVotes(current.id, extensionRound);

      // Update voting result on broadcast
      const votingResultValue =
        tally.result === "no_action" ? "pending" : tally.result;
      await db
        .update(broadcasts)
        .set({ votingResult: votingResultValue })
        .where(eq(broadcasts.id, current.id));

      if (tally.result === "skip") {
        // SKIP — mark as skipped
        await db
          .update(broadcasts)
          .set({
            status: "skipped",
            actualEndAt: sql`NOW()`,
            votingResult: "skip",
          })
          .where(eq(broadcasts.id, current.id));

        await db
          .update(streams)
          .set({
            lastBroadcastAt: sql`NOW()`,
            timesSkipped: sql`${streams.timesSkipped} + 1`,
            timesFeatured: sql`${streams.timesFeatured} + 1`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(streams.id, current.streamId));

        await db
          .update(queue)
          .set({ status: "completed", completedAt: sql`NOW()` })
          .where(eq(queue.id, current.queueEntryId));

        await applyCooldownReductions(
          current.streamId,
          extensionRound,
          current.submittedBy
        );

        // Award watch-time points and check badges for viewers
        await awardWatchTimePoints(current.id);
        if (current.submittedBy) {
          await checkAndAwardBadges(current.submittedBy);
        }

        await supabase.channel("broadcast-live").send({
          type: "broadcast",
          event: "stream_skipped",
          payload: { broadcast_id: current.id },
        });

        justEnded = true;
      } else if (
        tally.result === "stay" &&
        current.extensionsCount < current.maxExtensions
      ) {
        // STAY — extend by 10 minutes
        const newEnd = new Date(scheduledEndAt.getTime() + 10 * 60 * 1000);
        const newVotingOpens = new Date(newEnd.getTime() - 5 * 60 * 1000);

        await db
          .update(broadcasts)
          .set({
            extensionsCount: sql`${broadcasts.extensionsCount} + 1`,
            scheduledEndAt: newEnd.toISOString(),
            votingOpensAt: newVotingOpens.toISOString(),
            status: "extended",
            votingResult: "pending",
          })
          .where(eq(broadcasts.id, current.id));

        await db
          .update(streams)
          .set({
            timesExtended: sql`${streams.timesExtended} + 1`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(streams.id, current.streamId));

        // Award extension bonus (20 pts) to submitter
        if (current.submittedBy) {
          await awardPoints(
            current.submittedBy,
            20,
            "extension_bonus",
            current.id
          );
          await checkAndAwardBadges(current.submittedBy);
        }

        await supabase.channel("broadcast-live").send({
          type: "broadcast",
          event: "stream_extended",
          payload: {
            broadcast_id: current.id,
            new_end: newEnd.toISOString(),
            extensions_count: current.extensionsCount + 1,
          },
        });
      } else {
        // NO_QUORUM, NO_ACTION, or max extensions reached — complete
        await db
          .update(broadcasts)
          .set({
            status: "completed",
            actualEndAt: sql`NOW()`,
          })
          .where(eq(broadcasts.id, current.id));

        await db
          .update(streams)
          .set({
            lastBroadcastAt: sql`NOW()`,
            timesFeatured: sql`${streams.timesFeatured} + 1`,
            updatedAt: sql`NOW()`,
          })
          .where(eq(streams.id, current.streamId));

        await db
          .update(queue)
          .set({ status: "completed", completedAt: sql`NOW()` })
          .where(eq(queue.id, current.queueEntryId));

        await applyCooldownReductions(
          current.streamId,
          current.extensionsCount,
          current.submittedBy
        );

        // Award submitter bonus (10 pts)
        if (current.submittedBy) {
          await awardPoints(
            current.submittedBy,
            10,
            "submitting",
            current.id
          );
        }

        // Discovery bonus if max extensions reached (50 pts)
        if (
          current.extensionsCount >= current.maxExtensions &&
          current.submittedBy
        ) {
          await awardPoints(
            current.submittedBy,
            50,
            "discovery_bonus",
            current.id
          );
        }

        // Award watch-time points and check badges for submitter
        await awardWatchTimePoints(current.id);
        if (current.submittedBy) {
          await checkAndAwardBadges(current.submittedBy);
        }

        await supabase.channel("broadcast-live").send({
          type: "broadcast",
          event: "stream_ended",
          payload: { broadcast_id: current.id, reason: "completed" },
        });

        justEnded = true;
      }
    }
  }

  // If no current broadcast or current just ended, start the next one
  if (!current || justEnded) {
    const nextStream = await getNextLiveStream();

    if (nextStream) {
      const startedAt = new Date();
      const scheduledEndAt = new Date(startedAt.getTime() + 15 * 60 * 1000);
      const votingOpensAt = new Date(startedAt.getTime() + 10 * 60 * 1000);

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

      // Update queue entry
      await db
        .update(queue)
        .set({ status: "playing", startedAt: sql`NOW()` })
        .where(eq(queue.id, nextStream.queueId));

      await supabase.channel("broadcast-live").send({
        type: "broadcast",
        event: "new_stream",
        payload: {
          broadcast_id: newBroadcast.id,
          stream: {
            twitch_username: nextStream.twitchUsername,
            twitch_display_name: nextStream.twitchDisplayName,
            title: nextStream.streamTitle,
            category: nextStream.streamCategory,
            viewer_count: nextStream.viewerCount,
          },
        },
      });

      return NextResponse.json({
        action: "started",
        broadcast_id: newBroadcast.id,
      });
    }

    return NextResponse.json({ action: "idle", reason: "queue_empty" });
  }

  return NextResponse.json({ action: "checked", broadcast_id: current.id });
  } catch {
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
  // Get all waiting queue entries ordered by position
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
      // Stream data missing, skip
      await db
        .update(queue)
        .set({ status: "skipped_offline" })
        .where(eq(queue.id, entry.queueId));
      continue;
    }

    // Verify stream is live via Twitch Helix API
    const streamInfo = await getStreamInfo(entry.twitchUsername);

    if (!streamInfo) {
      // Stream is offline, mark as skipped
      await db
        .update(queue)
        .set({ status: "skipped_offline" })
        .where(eq(queue.id, entry.queueId));
      continue;
    }

    // Found a live stream
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

