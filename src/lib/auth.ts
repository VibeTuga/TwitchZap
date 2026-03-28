import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!profile) return null;

  return {
    auth: session.user,
    profile,
  };
}
