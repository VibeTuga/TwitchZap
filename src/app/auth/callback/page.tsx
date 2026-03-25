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
          router.replace("/auth/login?error=auth_failed");
          return;
        }

        if (data.user) {
          const meta = data.user.user_metadata;
          const twitchId = meta?.sub || meta?.provider_id;
          const twitchUsername =
            meta?.preferred_username || meta?.user_name;

          if (!twitchId || !twitchUsername) {
            router.replace("/auth/login?error=missing_profile");
            return;
          }

          const displayName = meta?.name || meta?.full_name || twitchUsername;
          const avatar = meta?.picture || meta?.avatar_url || "";

          const upsertPayload = {
            id: data.user.id,
            twitchId,
            twitchUsername,
            displayName,
            avatar,
          };

          let upsertOk = false;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const res = await fetch("/api/auth/upsert-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(upsertPayload),
              });
              if (res.ok) {
                upsertOk = true;
                break;
              }
            } catch {
              // Network error — will retry if first attempt
            }
          }

          if (!upsertOk) {
            console.warn(
              "[auth/callback] Profile upsert failed after 2 attempts — will retry on next server request"
            );
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
