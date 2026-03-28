"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

// Re-export useAuth so existing consumers don't break
export { useAuth } from "@/stores/authStore";

function AuthSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && session?.user) {
      const u = session.user as AuthUser;
      setUser(u);
    } else {
      setUser(undefined);
    }
  }, [session, status, setUser]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync>{children}</AuthSync>
    </SessionProvider>
  );
}
