import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isValidUUID } from "@/lib/validation";
import { db } from "@/db";
import { queue } from "@/db/schema";
import { eq, and, sql, gt } from "drizzle-orm";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { queue_entry_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isValidUUID(body.queue_entry_id)) {
      return NextResponse.json(
        { error: "Invalid or missing queue_entry_id" },
        { status: 400 }
      );
    }

    const queueEntryId = body.queue_entry_id;

    // Find the queue entry to get its position
    const [entry] = await db
      .select({ id: queue.id, position: queue.position, status: queue.status })
      .from(queue)
      .where(eq(queue.id, queueEntryId))
      .limit(1);

    if (!entry) {
      return NextResponse.json(
        { error: "Queue entry not found" },
        { status: 404 }
      );
    }

    if (entry.status !== "waiting") {
      return NextResponse.json(
        { error: "Can only remove entries with status 'waiting'" },
        { status: 400 }
      );
    }

    // Delete the entry
    await db.delete(queue).where(eq(queue.id, queueEntryId));

    // Reorder remaining waiting entries so positions are contiguous
    await db
      .update(queue)
      .set({ position: sql`${queue.position} - 1` })
      .where(
        and(eq(queue.status, "waiting"), gt(queue.position, entry.position))
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/queue error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
