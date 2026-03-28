import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export interface AuthUser {
  id: string;
  twitchId: string;
  twitchUsername: string;
  role: string;
  avatar: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AuthState {
  /** null = loading, undefined = not logged in, AuthUser = logged in */
  user: AuthUser | null | undefined;
  /** true once auth has resolved (loading is done) */
  ready: boolean;
  /** user is authenticated */
  isLoggedIn: boolean;
  setUser: (user: AuthUser | undefined) => void;
  setReady: (ready: boolean) => void;
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

  setReady: (ready) => set({ ready }),
}));

const authSelector = (s: AuthState) => ({
  user: s.user,
  ready: s.ready,
  isLoggedIn: s.isLoggedIn,
});

export function useAuth() {
  return useAuthStore(useShallow(authSelector));
}
