"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 60 seconds

export function useWatchTime(broadcastId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!broadcastId) return;

    async function sendHeartbeat() {
      try {
        await fetch("/api/viewer-sessions/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ broadcast_id: broadcastId }),
        });
      } catch {
        // Silently fail — will retry on next interval
      }
    }

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [broadcastId]);
}
