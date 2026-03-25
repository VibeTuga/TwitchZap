import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Upsert user profile
      const meta = data.user.user_metadata;
      const twitchId = meta?.sub || meta?.provider_id;
      const twitchUsername = meta?.preferred_username || meta?.user_name;

      if (twitchId && twitchUsername) {
        const displayName = meta?.name || meta?.full_name || twitchUsername;
        const avatar = meta?.picture || meta?.avatar_url || null;

        try {
          await db
            .insert(users)
            .values({
              id: data.user.id,
              twitchId,
              twitchUsername,
              twitchDisplayName: displayName,
              twitchAvatarUrl: avatar,
            })
            .onConflictDoUpdate({
              target: users.id,
              set: {
                twitchUsername,
                twitchDisplayName: displayName,
                twitchAvatarUrl: avatar,
                updatedAt: sql`now()`,
              },
            });
        } catch {
          console.warn(
            "[auth/callback] Profile upsert failed for user:",
            data.user.id
          );
        }
      }

      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
