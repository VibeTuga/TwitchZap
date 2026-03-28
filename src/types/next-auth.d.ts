import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      twitchId: string;
      twitchUsername: string;
      role: string;
      avatar: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    twitchId: string;
    twitchUsername: string;
    role: string;
    avatar: string | null;
  }
}
