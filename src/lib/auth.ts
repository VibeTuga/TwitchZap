import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  // Fallback: if auth exists but profile row is missing (callback upsert failed),
  // create the profile on-the-fly from auth metadata
  if (!profile) {
    const meta = authUser.user_metadata;
    const twitchId = meta?.sub || meta?.provider_id;
    const twitchUsername = meta?.preferred_username || meta?.user_name;

    if (!twitchId || !twitchUsername) return null;

    const displayName = meta?.name || meta?.full_name || twitchUsername;
    const avatar = meta?.picture || meta?.avatar_url || null;

    try {
      const [created] = await db
        .insert(users)
        .values({
          id: authUser.id,
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
        })
        .returning();

      profile = created;
    } catch {
      console.warn("[auth] Fallback profile upsert failed for user:", authUser.id);
      return null;
    }
  }

  return {
    auth: authUser,
    profile,
  };
}
