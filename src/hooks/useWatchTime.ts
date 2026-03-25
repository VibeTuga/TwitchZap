"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 60 seconds
const POINTS_TOAST_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface HeartbeatResponse {
  success: boolean;
  watch_seconds: number;
  points_awarded: number;
  new_badges: Array<{
    name: string;
    icon: string;
    pointsReward: number;
  }>;
}

export function useWatchTime(broadcastId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointsToastRef = useRef<number>(0);

  useEffect(() => {
    if (!broadcastId) return;

    async function sendHeartbeat() {
      try {
        const res = await fetch("/api/viewer-sessions/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ broadcast_id: broadcastId }),
        });

        if (!res.ok) return;

        const data: HeartbeatResponse = await res.json();

        // Show points toast throttled to every 5 minutes
        if (data.points_awarded > 0) {
          const now = Date.now();
          if (now - lastPointsToastRef.current >= POINTS_TOAST_INTERVAL_MS) {
            lastPointsToastRef.current = now;
            toast("Earned Zap Points for watching", {
              description: `+${data.points_awarded} Zap Point${data.points_awarded > 1 ? "s" : ""}`,
            });
          }
        }

        // Show badge toasts immediately (these are rare and celebratory)
        if (data.new_badges?.length > 0) {
          for (const badge of data.new_badges) {
            toast.success(`Badge Unlocked: ${badge.name}!`, {
              description: badge.pointsReward > 0
                ? `${badge.icon} +${badge.pointsReward} bonus Zap Points`
                : badge.icon,
            });
          }
        }
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
