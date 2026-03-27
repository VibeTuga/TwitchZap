"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

// Re-export useAuth so existing consumers don't break
export { useAuth } from "@/stores/authStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  return <>{children}</>;
}
