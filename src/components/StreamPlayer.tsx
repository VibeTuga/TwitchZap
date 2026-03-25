"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface StreamPlayerProps {
  channel: string | null;
  broadcastId: string | null;
  isReconnecting?: boolean;
  gracePeriodExpiresAt?: string | null;
}

export function StreamPlayer({
  channel,
  broadcastId,
  isReconnecting,
  gracePeriodExpiresAt,
}: StreamPlayerProps) {
  const playerRef = useRef<TwitchPlayerInstance | null>(null);
  const broadcastIdRef = useRef(broadcastId);

  useEffect(() => {
    broadcastIdRef.current = broadcastId;
  }, [broadcastId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [currentChannel, setCurrentChannel] = useState(channel);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [countdownDone, setCountdownDone] = useState(false);
  const reduced = useReducedMotion();

  // Countdown timer based on grace period expiration
  useEffect(() => {
    if (!isReconnecting || !gracePeriodExpiresAt) return;

    const calcRemaining = () => Math.max(
      0,
      Math.ceil((new Date(gracePeriodExpiresAt).getTime() - Date.now()) / 1000)
    );

    const tick = () => {
      const remaining = calcRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setCountdownDone(true);
        clearInterval(intervalId);
      } else {
        setCountdownDone(false);
      }
    };

    // Defer first tick to avoid synchronous setState in effect body
    const initialTimer = setTimeout(tick, 0);
    const intervalId = setInterval(tick, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [isReconnecting, gracePeriodExpiresAt]);

  if (channel !== currentChannel && !isTransitioning) {
    setIsTransitioning(true);
  }

  useEffect(() => {
    if (!isTransitioning) return;
    const timer = setTimeout(() => {
      setCurrentChannel(channel);
      setIsTransitioning(false);
    }, reduced ? 0 : 300);
    return () => clearTimeout(timer);
  }, [isTransitioning, channel, reduced]);

  // Twitch Interactive Player instantiation
  useEffect(() => {
    if (!currentChannel || isTransitioning) return;

    const containerId = `twitch-player-${currentChannel}`;
    let destroyed = false;

    const initPlayer = (): boolean => {
      if (destroyed) return true;
      if (!window.Twitch?.Player) return false;

      const container = document.getElementById(containerId);
      if (!container) return false;

      const player = new window.Twitch.Player(containerId, {
        channel: currentChannel,
        parent: [window.location.hostname],
        width: "100%",
        height: "100%",
        muted: true,
      });

      playerRef.current = player;

      const reportLiveness = (status: "offline" | "online") => {
        const bid = broadcastIdRef.current;
        if (!bid) return;
        fetch("/api/liveness/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ broadcast_id: bid, status }),
        }).catch(() => {
          // Silently fail — server-side polling is the fallback
        });
      };

      player.addEventListener(window.Twitch.Player.OFFLINE, () =>
        reportLiveness("offline")
      );
      player.addEventListener(window.Twitch.Player.ONLINE, () =>
        reportLiveness("online")
      );

      return true;
    };

    if (!initPlayer()) {
      const interval = setInterval(() => {
        if (initPlayer()) clearInterval(interval);
      }, 200);

      const timeout = setTimeout(() => clearInterval(interval), 10_000);

      return () => {
        destroyed = true;
        clearInterval(interval);
        clearTimeout(timeout);
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [currentChannel, isTransitioning]);

  const fadeVariants = reduced
    ? { enter: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.3 } },
      };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video md:rounded-2xl overflow-hidden bg-surface-container"
    >
      <AnimatePresence mode="wait">
        {isTransitioning ? (
          <motion.div
            key="transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="absolute inset-0 flex items-center justify-center bg-surface-container"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary-dim flex items-center justify-center animate-bolt-pulse shadow-[0_0_20px_rgba(170,48,250,0.4)]">
                <span
                  className="material-symbols-outlined text-on-primary-fixed text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
              </div>
              <p className="text-sm text-on-surface-variant font-headline font-bold">
                Loading stream...
              </p>
            </div>
          </motion.div>
        ) : currentChannel ? (
          <motion.div
            key={currentChannel}
            variants={fadeVariants}
            initial={{ opacity: 0 }}
            animate="enter"
            exit="exit"
            className="absolute inset-0"
          >
            <div
              id={`twitch-player-${currentChannel}`}
              className="w-full h-full"
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            variants={fadeVariants}
            initial={{ opacity: 0 }}
            animate="enter"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-xl bg-primary-dim/20 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-primary-dim text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  sensors
                </span>
              </div>
              <p className="text-sm text-on-surface-variant">
                Waiting for stream...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reconnecting overlay with countdown */}
      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              {countdownDone ? (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3 }}
                  className="text-sm text-on-surface-variant font-headline font-bold"
                >
                  Moving to next stream...
                </motion.p>
              ) : (
                <>
                  {/* Circular progress ring with countdown number */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg
                      className="absolute inset-0 w-full h-full -rotate-90"
                      viewBox="0 0 96 96"
                      aria-hidden="true"
                    >
                      {/* Background ring */}
                      <circle
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-surface-container"
                      />
                      {/* Progress ring */}
                      <circle
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-tertiary"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - secondsRemaining / 30)}
                        style={reduced ? undefined : { transition: "stroke-dashoffset 1s linear" }}
                      />
                    </svg>
                    <span
                      className={`text-4xl font-headline font-bold text-tertiary tabular-nums${
                        secondsRemaining <= 10 ? " animate-countdown-pulse" : ""
                      }`}
                    >
                      {secondsRemaining}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <p className="text-sm text-on-surface-variant font-headline font-bold">
                      Reconnecting...
                    </p>
                    <p className="text-xs text-on-surface-variant/60">
                      seconds remaining
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
