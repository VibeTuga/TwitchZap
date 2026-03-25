"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePresence(userId: string | null) {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel("viewers", {
      config: { presence: { key: userId ?? "anonymous" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { viewerCount };
}
