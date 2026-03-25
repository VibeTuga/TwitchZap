import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { canVote } from "@/lib/voting";
import { db } from "@/db";
import { votes, broadcasts, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { broadcast_id?: string; vote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { broadcast_id, vote } = body;

  if (!broadcast_id || !vote) {
    return NextResponse.json(
      { error: "broadcast_id and vote are required" },
      { status: 400 }
    );
  }

  if (vote !== "skip" && vote !== "stay") {
    return NextResponse.json(
      { error: "vote must be 'skip' or 'stay'" },
      { status: 400 }
    );
  }

  // Fetch broadcast and validate voting window
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

  const now = new Date();
  const votingOpensAt = broadcast.votingOpensAt
    ? new Date(broadcast.votingOpensAt)
    : null;
  const scheduledEndAt = new Date(broadcast.scheduledEndAt);

  if (!votingOpensAt || now < votingOpensAt) {
    return NextResponse.json(
      { error: "Voting has not opened yet" },
      { status: 400 }
    );
  }

  if (now >= scheduledEndAt) {
    return NextResponse.json(
      { error: "Voting window has closed" },
      { status: 400 }
    );
  }

  if (!["live", "voting", "extended"].includes(broadcast.status)) {
    return NextResponse.json(
      { error: "Broadcast is not active" },
      { status: 400 }
    );
  }

  // Check if user already voted this round
  const extensionRound = broadcast.extensionsCount;
  const canUserVote = await canVote(broadcast_id, user.profile.id, extensionRound);
  if (!canUserVote) {
    return NextResponse.json(
      { error: "Already voted this round" },
      { status: 409 }
    );
  }

  // Insert vote
  await db.insert(votes).values({
    broadcastId: broadcast_id,
    userId: user.profile.id,
    vote,
    extensionRound,
  });

  // Update denormalized counts on broadcast
  const skipInc = vote === "skip" ? 1 : 0;
  const stayInc = vote === "stay" ? 1 : 0;

  await db
    .update(broadcasts)
    .set({
      totalVotes: sql`${broadcasts.totalVotes} + 1`,
      skipVotes: sql`${broadcasts.skipVotes} + ${skipInc}`,
      stayVotes: sql`${broadcasts.stayVotes} + ${stayInc}`,
    })
    .where(eq(broadcasts.id, broadcast_id));

  // Increment user's votes_cast
  await db
    .update(users)
    .set({
      votesCast: sql`${users.votesCast} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(users.id, user.profile.id));

  // Broadcast vote_update via Supabase Realtime
  const currentSkip = (broadcast.skipVotes ?? 0) + skipInc;
  const currentStay = (broadcast.stayVotes ?? 0) + stayInc;

  const supabase = createAdminClient();
  await supabase.channel("votes-live").send({
    type: "broadcast",
    event: "vote_update",
    payload: {
      broadcast_id,
      skip: currentSkip,
      stay: currentStay,
      total: currentSkip + currentStay,
    },
  });

  return NextResponse.json({
    success: true,
    current_totals: {
      skip: currentSkip,
      stay: currentStay,
    },
  });
}
