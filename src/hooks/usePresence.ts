"use client";

import { useEffect, useState, useCallback } from "react";

export function usePresence(userId: string | null) {
  const [viewerCount, setViewerCount] = useState(0);

  const sendHeartbeat = useCallback(async () => {
    if (!userId) return;
    try {
      await fetch("/api/viewer-sessions/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // Silently fail
    }
  }, [userId]);

  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30s
    const heartbeatInterval = setInterval(sendHeartbeat, 30_000);

    // Poll viewer count
    const fetchViewerCount = async () => {
      try {
        const res = await fetch("/api/broadcasts");
        const data = await res.json();
        if (data.broadcast?.viewerCount != null) {
          setViewerCount(data.broadcast.viewerCount);
        }
      } catch {
        // Silently fail
      }
    };

    fetchViewerCount();
    const countInterval = setInterval(fetchViewerCount, 15_000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(countInterval);
    };
  }, [sendHeartbeat]);

  return { viewerCount };
}
