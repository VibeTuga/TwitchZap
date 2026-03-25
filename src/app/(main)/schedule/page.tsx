import type { Metadata } from "next";
import { getQueue, getRecentBroadcasts } from "@/lib/queue";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ScheduleTabs } from "./ScheduleTabs";

export const metadata: Metadata = {
  title: "Broadcast Schedule",
};

export default async function SchedulePage() {
  const queueEntries = await getQueue("waiting");
  const recentBroadcasts = await getRecentBroadcasts();

  // Check for active broadcast
  const [activeBroadcast] = await db
    .select()
    .from(broadcasts)
    .where(eq(broadcasts.status, "live"))
    .limit(1);

  const now = new Date();
  const timeUntilNext = activeBroadcast
    ? Math.max(
        0,
        new Date(activeBroadcast.scheduledEndAt).getTime() - now.getTime()
      )
    : null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">
          Broadcast Schedule
        </h1>
        <p className="text-on-surface-variant mt-2">
          {queueEntries.length} stream{queueEntries.length !== 1 ? "s" : ""} in
          queue
          {timeUntilNext !== null && (
            <span>
              {" "}
              &middot; Next up in {Math.floor(timeUntilNext / 60000)}m{" "}
              {Math.floor((timeUntilNext % 60000) / 1000)}s
            </span>
          )}
        </p>
      </div>

      <ErrorBoundary fallbackMessage="Schedule unavailable">
        <ScheduleTabs
          queueEntries={queueEntries}
          recentBroadcasts={recentBroadcasts}
          activeBroadcastId={activeBroadcast?.id ?? null}
        />
      </ErrorBoundary>
    </div>
  );
}
