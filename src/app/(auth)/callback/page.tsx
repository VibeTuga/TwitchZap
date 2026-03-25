"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();
      const { searchParams } = new URL(window.location.href);
      const code = searchParams.get("code");

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          router.replace("/login?error=auth_failed");
          return;
        }

        if (data.user) {
          const meta = data.user.user_metadata;
          const twitchId = meta?.sub || meta?.provider_id;
          const twitchUsername =
            meta?.preferred_username || meta?.user_name;

          if (!twitchId || !twitchUsername) {
            router.replace("/login?error=missing_profile");
            return;
          }

          const displayName = meta?.name || meta?.full_name || twitchUsername;
          const avatar = meta?.picture || meta?.avatar_url || "";

          try {
            await fetch("/api/auth/upsert-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: data.user.id,
                twitchId,
                twitchUsername,
                displayName,
                avatar,
              }),
            });
          } catch {
            // User upsert failed silently — profile may be created on next visit
          }
        }
      }

      router.replace("/");
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-primary-dim/20 flex items-center justify-center mx-auto animate-pulse">
          <span className="material-symbols-outlined text-primary-dim text-2xl">
            sync
          </span>
        </div>
        <p className="text-on-surface-variant">Connecting your account...</p>
      </div>
    </div>
  );
}
