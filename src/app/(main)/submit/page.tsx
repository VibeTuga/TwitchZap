"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton-card";

interface ChannelInfo {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

interface StreamInfo {
  title: string;
  game_name: string;
  viewer_count: number;
}

interface CheckResult {
  status: "live" | "offline" | "cooldown" | "in_queue" | "not_found";
  channel?: ChannelInfo;
  stream?: StreamInfo | null;
  cooldown_remaining?: { hours: number; minutes: number } | null;
  queue_position?: number | null;
  error?: string;
}

interface SubmissionResult {
  success: boolean;
  queue_position: number;
  stream: {
    id: string;
    twitch_username: string;
    twitch_display_name: string;
    twitch_avatar_url: string;
    category: string | null;
    viewer_count: number;
    title: string;
  };
}

export default function SubmitPage() {
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmissionResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setChecking(true);
    setCheckResult(null);
    setSubmitResult(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/streams/check?username=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (res.status === 404) {
        setCheckResult({ status: "not_found", error: data.error });
      } else if (!res.ok) {
        setError(data.error || "Failed to check stream");
      } else {
        setCheckResult(data);
      }
    } catch {
      setError("Failed to check stream. Please try again.");
    } finally {
      setChecking(false);
    }
  }, [username]);

  const handleSubmit = useCallback(async () => {
    if (!checkResult || checkResult.status !== "live") return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitch_username: checkResult.channel?.login,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("You must be logged in to submit a stream.");
        } else {
          setError(data.error || "Failed to submit stream");
        }
      } else {
        setSubmitResult(data);
        setCheckResult(null);
        setUsername("");
        toast.success("Stream submitted!", {
          description: `${data.stream.twitch_display_name} is at position #${data.queue_position} in queue`,
        });
      }
    } catch {
      setError("Failed to submit stream. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [checkResult]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCheck();
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">
          Submit a Stream
        </h1>
        <p className="text-on-surface-variant mt-2">
          Give a streamer their 15 minutes of fame
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-surface-container rounded-2xl p-4 sm:p-6 space-y-4">
        <label className="text-sm font-label font-medium text-on-surface-variant">
          Twitch Username
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter Twitch username or channel URL..."
              className="w-full h-12 bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 rounded-xl px-4 text-sm font-body outline-none border-none border-b-2 border-transparent focus:border-b-2 focus:border-primary-dim transition-colors"
            />
          </div>
          <button
            onClick={handleCheck}
            disabled={!username.trim() || checking}
            className="h-12 w-full sm:w-auto px-6 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed font-headline font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(170,48,250,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? (
              <span className="material-symbols-outlined animate-spin text-lg">
                progress_activity
              </span>
            ) : (
              "Check"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-container/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-xl">
            error
          </span>
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Success */}
      {submitResult && (
        <div className="bg-secondary-container/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary text-xl">
            check_circle
          </span>
          <div>
            <p className="text-secondary text-sm font-bold">
              Stream submitted successfully!
            </p>
            <p className="text-on-surface-variant text-xs mt-0.5">
              {submitResult.stream.twitch_display_name} is at queue position #
              {submitResult.queue_position}
            </p>
          </div>
        </div>
      )}

      {/* Checking skeleton */}
      {checking && (
        <div className="bg-surface-container-high rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      )}

      {/* Preview Card */}
      {checkResult && !checking && (
        <div className="bg-surface-container-high rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-xl">
              <AvatarImage
                src={checkResult.channel?.profile_image_url}
                alt={checkResult.channel?.display_name}
              />
              <AvatarFallback className="bg-surface-variant text-on-surface-variant rounded-xl">
                {checkResult.channel?.display_name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-headline font-bold text-on-surface truncate">
                {checkResult.channel?.display_name}
              </h3>
              {checkResult.stream && (
                <p className="text-sm text-on-surface-variant truncate">
                  {checkResult.stream.game_name || "No category"}
                </p>
              )}
            </div>
            {checkResult.stream && (
              <div className="flex items-center gap-1.5 text-error text-sm font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                {checkResult.stream.viewer_count.toLocaleString()} viewers
              </div>
            )}
          </div>

          {/* Status Indicator */}
          <StatusBadge
            status={checkResult.status}
            cooldown={checkResult.cooldown_remaining}
            queuePosition={checkResult.queue_position}
          />

          {/* Submit Button */}
          {checkResult.status === "live" && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed font-headline font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(170,48,250,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">
                    progress_activity
                  </span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    publish
                  </span>
                  Add to Queue
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Cooldown Info */}
      <div className="bg-surface-container rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-xl mt-0.5">
            info
          </span>
          <div className="space-y-1.5">
            <p className="text-sm text-on-surface-variant">
              Streams can air once every{" "}
              <span className="text-on-surface font-medium">20 hours</span>.
              The stream must be{" "}
              <span className="text-secondary font-medium">live</span> on
              Twitch to be submitted.
            </p>
            <p className="text-xs text-on-surface-variant/70">
              Earn Zap Points to boost cooldowns and get streams back on air
              faster!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  cooldown,
  queuePosition,
}: {
  status: string;
  cooldown?: { hours: number; minutes: number } | null;
  queuePosition?: number | null;
}) {
  switch (status) {
    case "live":
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary-container/10 rounded-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(89,238,80,0.6)]" />
          <span className="text-sm font-bold text-secondary">LIVE</span>
          <span className="text-sm text-on-surface-variant">
            — Ready to submit
          </span>
        </div>
      );
    case "offline":
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-error-container/10 rounded-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-error" />
          <span className="text-sm font-bold text-error">OFFLINE</span>
          <span className="text-sm text-on-surface-variant">
            — Must be live to submit
          </span>
        </div>
      );
    case "cooldown":
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-variant/30 rounded-lg">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            schedule
          </span>
          <span className="text-sm font-bold text-on-surface-variant">
            COOLDOWN
          </span>
          <span className="text-sm text-on-surface-variant">
            — Available in {cooldown?.hours}h {cooldown?.minutes}m
          </span>
        </div>
      );
    case "in_queue":
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-dim/10 rounded-lg">
          <span className="material-symbols-outlined text-primary text-lg">
            queue
          </span>
          <span className="text-sm font-bold text-primary">IN QUEUE</span>
          <span className="text-sm text-on-surface-variant">
            — Already at position #{queuePosition}
          </span>
        </div>
      );
    case "not_found":
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-error-container/10 rounded-lg">
          <span className="material-symbols-outlined text-error text-lg">
            search_off
          </span>
          <span className="text-sm text-error">Channel not found on Twitch</span>
        </div>
      );
    default:
      return null;
  }
}
