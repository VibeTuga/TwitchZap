import { db } from "@/db";
import { streams, cooldownBoosts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const BASE_COOLDOWN_HOURS = 20;
const MIN_COOLDOWN_HOURS = 4;

export interface CooldownStatus {
  inCooldown: boolean;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  effectiveCooldownHours: number;
  cooldownEndsAt: Date | null;
}

export async function calculateCooldown(streamId: string): Promise<number> {
  const [totalReduced] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${cooldownBoosts.hoursReduced}), 0)`,
    })
    .from(cooldownBoosts)
    .where(eq(cooldownBoosts.streamId, streamId));

  const reduced = parseFloat(totalReduced?.total ?? "0");
  const effective = BASE_COOLDOWN_HOURS - reduced;

  return Math.max(effective, MIN_COOLDOWN_HOURS);
}

export async function isInCooldown(streamId: string): Promise<CooldownStatus> {
  const [stream] = await db
    .select({
      lastBroadcastAt: streams.lastBroadcastAt,
      cooldownHours: streams.cooldownHours,
    })
    .from(streams)
    .where(eq(streams.id, streamId))
    .limit(1);

  if (!stream?.lastBroadcastAt) {
    return {
      inCooldown: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      effectiveCooldownHours: BASE_COOLDOWN_HOURS,
      cooldownEndsAt: null,
    };
  }

  const effectiveHours = parseFloat(stream.cooldownHours);
  const lastBroadcast = new Date(stream.lastBroadcastAt).getTime();
  const cooldownMs = effectiveHours * 60 * 60 * 1000;
  const cooldownEnd = lastBroadcast + cooldownMs;
  const remainingMs = Math.max(0, cooldownEnd - Date.now());

  return {
    inCooldown: remainingMs > 0,
    remainingMs,
    remainingHours: Math.floor(remainingMs / (60 * 60 * 1000)),
    remainingMinutes: Math.floor(
      (remainingMs % (60 * 60 * 1000)) / (60 * 1000)
    ),
    effectiveCooldownHours: effectiveHours,
    cooldownEndsAt: remainingMs > 0 ? new Date(cooldownEnd) : null,
  };
}

export async function applyCooldownReductions(
  streamId: string,
  extensionsCount: number,
  submittedBy: string | null
): Promise<void> {
  const boosts: {
    streamId: string;
    userId: string;
    boostType: string;
    hoursReduced: string;
  }[] = [];

  // Extension streak: 2+ extensions = -25% (5 hours)
  if (extensionsCount >= 2) {
    boosts.push({
      streamId,
      userId: submittedBy ?? streamId, // fallback shouldn't happen
      boostType: "extension_streak",
      hoursReduced: "5.00",
    });
  }

  // Max extensions: 3 extensions = -50% (10 hours)
  if (extensionsCount >= 3) {
    boosts.push({
      streamId,
      userId: submittedBy ?? streamId,
      boostType: "max_extension",
      hoursReduced: "10.00",
    });
  }

  if (boosts.length > 0) {
    await db.insert(cooldownBoosts).values(boosts);

    // Recalculate and update effective cooldown on the stream
    const effectiveHours = await calculateCooldown(streamId);
    await db
      .update(streams)
      .set({
        cooldownHours: effectiveHours.toFixed(2),
        updatedAt: sql`NOW()`,
      })
      .where(eq(streams.id, streamId));
  }
}
