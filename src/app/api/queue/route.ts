import { NextResponse } from "next/server";
import { getQueue } from "@/lib/queue";

export async function GET() {
  const queueEntries = await getQueue("waiting");

  return NextResponse.json({
    queue: queueEntries,
    total: queueEntries.length,
  });
}
