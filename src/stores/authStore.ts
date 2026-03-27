import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  /** null = loading, undefined = not logged in, User = logged in */
  user: User | null | undefined;
  /** true once auth has resolved (loading is done) */
  ready: boolean;
  /** user is authenticated */
  isLoggedIn: boolean;
  setUser: (user: User | undefined) => void;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  isLoggedIn: false,

  setUser: (user) =>
    set({
      user,
      ready: true,
      isLoggedIn: user != null && user !== undefined,
    }),

  initialize: () => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      set({
        user: authUser ?? undefined,
        ready: true,
        isLoggedIn: !!authUser,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      const u = session?.user ?? undefined;
      set({
        user: u,
        ready: true,
        isLoggedIn: !!u,
      });
    });

    return () => subscription.unsubscribe();
  },
}));

export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    ready: s.ready,
    isLoggedIn: s.isLoggedIn,
  }));
}
