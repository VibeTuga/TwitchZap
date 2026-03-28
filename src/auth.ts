import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      const twitchId = profile.sub || account.providerAccountId;
      const twitchUsername =
        (profile as Record<string, string>).preferred_username ||
        (profile as Record<string, string>).login ||
        user.name ||
        "";

      if (!twitchId || !twitchUsername) return false;

      const displayName = user.name || twitchUsername;
      const avatar = user.image || null;

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.twitchId, twitchId))
        .limit(1);

      if (existing) {
        await db
          .update(users)
          .set({
            twitchUsername,
            twitchDisplayName: displayName,
            twitchAvatarUrl: avatar,
            updatedAt: sql`now()`,
          })
          .where(eq(users.id, existing.id));
      } else {
        await db.insert(users).values({
          id: crypto.randomUUID(),
          twitchId,
          twitchUsername,
          twitchDisplayName: displayName,
          twitchAvatarUrl: avatar,
        });
      }

      return true;
    },

    async jwt({ token, account, profile }) {
      // On initial sign-in, enrich token with DB user data
      if (account && profile) {
        const twitchId = profile.sub || account.providerAccountId;
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.twitchId, twitchId!))
          .limit(1);

        if (dbUser) {
          token.userId = dbUser.id;
          token.twitchId = dbUser.twitchId;
          token.twitchUsername = dbUser.twitchUsername;
          token.role = dbUser.role;
          token.avatar = dbUser.twitchAvatarUrl;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.twitchId = token.twitchId as string;
        session.user.twitchUsername = token.twitchUsername as string;
        session.user.role = token.role as string;
        session.user.avatar = (token.avatar as string) || null;
      }
      return session;
    },
  },
});
