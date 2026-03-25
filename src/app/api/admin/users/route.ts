import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isValidUUID } from "@/lib/validation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const VALID_ROLES = ["member", "moderator", "admin"] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roleFilter = request.nextUrl.searchParams.get("role");

    if (roleFilter && !VALID_ROLES.includes(roleFilter as typeof VALID_ROLES[number])) {
      return NextResponse.json(
        { error: "Invalid role filter" },
        { status: 400 }
      );
    }

    const query = db
      .select({
        id: users.id,
        twitchUsername: users.twitchUsername,
        twitchDisplayName: users.twitchDisplayName,
        twitchAvatarUrl: users.twitchAvatarUrl,
        role: users.role,
        zapPoints: users.zapPoints,
        createdAt: users.createdAt,
      })
      .from(users);

    const result = roleFilter
      ? await query.where(eq(users.role, roleFilter)).orderBy(desc(users.createdAt))
      : await query.orderBy(desc(users.createdAt));

    return NextResponse.json({ users: result });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { user_id?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isValidUUID(body.user_id)) {
      return NextResponse.json(
        { error: "Invalid or missing user_id" },
        { status: 400 }
      );
    }

    if (!body.role || !VALID_ROLES.includes(body.role as typeof VALID_ROLES[number])) {
      return NextResponse.json(
        { error: "role must be 'member', 'moderator', or 'admin'" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({
        role: body.role,
        updatedAt: sql`NOW()`,
      })
      .where(eq(users.id, body.user_id))
      .returning({
        id: users.id,
        twitchUsername: users.twitchUsername,
        role: users.role,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error("PATCH /api/admin/users error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
