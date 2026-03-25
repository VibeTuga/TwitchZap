import { NextResponse } from "next/server";
import { getQueue } from "@/lib/queue";

export async function GET() {
  try {
    const queueEntries = await getQueue("waiting");

    return NextResponse.json(
      {
        queue: queueEntries,
        total: queueEntries.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
