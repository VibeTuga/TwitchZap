import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, twitchId, twitchUsername, displayName, avatar } = body;

    if (!id || !twitchId || !twitchUsername) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await db
      .insert(users)
      .values({
        id,
        twitchId,
        twitchUsername,
        twitchDisplayName: displayName || twitchUsername,
        twitchAvatarUrl: avatar || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          twitchUsername,
          twitchDisplayName: displayName || twitchUsername,
          twitchAvatarUrl: avatar || null,
          updatedAt: sql`now()`,
        },
      });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to upsert user" },
      { status: 500 }
    );
  }
}
