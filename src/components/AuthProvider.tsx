"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  /** null while loading, User when logged in, undefined when not logged in */
  user: User | null | undefined;
  /** Convenience flag: true once auth has resolved (loading is done) */
  ready: boolean;
  /** Convenience flag: user is authenticated */
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  isLoggedIn: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // null = loading, undefined = not logged in, User = logged in
  const [user, setUser] = useState<User | null | undefined>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser ?? undefined);
    });

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      setUser(session?.user ?? undefined);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user,
      ready: user !== null,
      isLoggedIn: user != null && user !== undefined,
    }),
    [user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
