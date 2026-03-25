"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface StreamPlayerProps {
  channel: string | null;
  isReconnecting?: boolean;
}

export function StreamPlayer({ channel, isReconnecting }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentChannel, setCurrentChannel] = useState(channel);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const reduced = useReducedMotion();

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
            <iframe
              src={`https://player.twitch.tv/?channel=${currentChannel}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&muted=true`}
              className="w-full h-full"
              allowFullScreen
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

      {/* Reconnecting overlay */}
      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl animate-spin">
                progress_activity
              </span>
              <p className="text-sm text-on-surface-variant font-headline font-bold">
                Reconnecting...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
