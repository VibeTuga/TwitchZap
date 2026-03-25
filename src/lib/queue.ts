import { db } from "@/db";
import { queue, streams, users, broadcasts } from "@/db/schema";
import { eq, sql, desc, asc } from "drizzle-orm";

export async function addToQueue(streamId: string, userId: string) {
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${queue.position}), 0)` })
    .from(queue);

  const position = (maxPos?.max ?? 0) + 1;

  const [entry] = await db
    .insert(queue)
    .values({
      streamId,
      submittedBy: userId,
      position,
      status: "waiting",
    })
    .returning();

  return entry;
}

export async function getQueue(status?: string) {
  const conditions = status ? eq(queue.status, status) : undefined;

  return db
    .select({
      id: queue.id,
      position: queue.position,
      status: queue.status,
      submittedAt: queue.submittedAt,
      startedAt: queue.startedAt,
      completedAt: queue.completedAt,
      stream: {
        id: streams.id,
        twitchUsername: streams.twitchUsername,
        twitchDisplayName: streams.twitchDisplayName,
        twitchAvatarUrl: streams.twitchAvatarUrl,
        category: streams.category,
        twitchChannelId: streams.twitchChannelId,
      },
      submittedBy: {
        id: users.id,
        twitchUsername: users.twitchUsername,
        twitchDisplayName: users.twitchDisplayName,
        twitchAvatarUrl: users.twitchAvatarUrl,
      },
    })
    .from(queue)
    .leftJoin(streams, eq(queue.streamId, streams.id))
    .leftJoin(users, eq(queue.submittedBy, users.id))
    .where(conditions)
    .orderBy(asc(queue.position));
}

export async function getNextWaiting() {
  const [entry] = await db
    .select({
      id: queue.id,
      position: queue.position,
      streamId: queue.streamId,
      submittedBy: queue.submittedBy,
      submittedAt: queue.submittedAt,
      stream: {
        id: streams.id,
        twitchUsername: streams.twitchUsername,
        twitchDisplayName: streams.twitchDisplayName,
        twitchAvatarUrl: streams.twitchAvatarUrl,
        category: streams.category,
        twitchChannelId: streams.twitchChannelId,
      },
    })
    .from(queue)
    .leftJoin(streams, eq(queue.streamId, streams.id))
    .where(eq(queue.status, "waiting"))
    .orderBy(asc(queue.position))
    .limit(1);

  return entry ?? null;
}

export async function getRecentBroadcasts() {
  return db
    .select({
      id: broadcasts.id,
      startedAt: broadcasts.startedAt,
      actualEndAt: broadcasts.actualEndAt,
      scheduledEndAt: broadcasts.scheduledEndAt,
      status: broadcasts.status,
      votingResult: broadcasts.votingResult,
      peakViewers: broadcasts.peakViewers,
      extensionsCount: broadcasts.extensionsCount,
      streamTitle: broadcasts.streamTitle,
      streamCategory: broadcasts.streamCategory,
      stream: {
        id: streams.id,
        twitchUsername: streams.twitchUsername,
        twitchDisplayName: streams.twitchDisplayName,
        twitchAvatarUrl: streams.twitchAvatarUrl,
        category: streams.category,
      },
      submittedBy: {
        id: users.id,
        twitchUsername: users.twitchUsername,
        twitchDisplayName: users.twitchDisplayName,
        twitchAvatarUrl: users.twitchAvatarUrl,
      },
    })
    .from(broadcasts)
    .leftJoin(streams, eq(broadcasts.streamId, streams.id))
    .leftJoin(users, eq(broadcasts.submittedBy, users.id))
    .where(
      sql`${broadcasts.status} IN ('completed', 'skipped', 'ended_offline')`
    )
    .orderBy(desc(broadcasts.startedAt))
    .limit(20);
}
