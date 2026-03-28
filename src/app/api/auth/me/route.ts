import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.profile.id,
      twitchUsername: user.profile.twitchUsername,
      twitchDisplayName: user.profile.twitchDisplayName,
      role: user.profile.role,
      zapPoints: user.profile.zapPoints,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
