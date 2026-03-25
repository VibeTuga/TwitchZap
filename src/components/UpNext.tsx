"use client";

import Image from "next/image";
import Link from "next/link";
import { useQueue } from "@/hooks/useQueue";

export function UpNext() {
  const { queue, loading } = useQueue();
  const topThree = queue.slice(0, 3);

  if (loading) {
    return (
      <div>
        <h4 className="text-lg font-headline font-bold mb-4 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            queue
          </span>
          Up Next in Queue
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-container p-4 rounded-2xl animate-pulse"
            >
              <div className="h-32 mb-4 rounded-xl bg-surface-container-high" />
              <div className="h-4 w-2/3 rounded bg-surface-container-high mb-2" />
              <div className="h-3 w-1/2 rounded bg-surface-container-high" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topThree.length === 0) {
    return (
      <div>
        <h4 className="text-lg font-headline font-bold mb-4 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            queue
          </span>
          Up Next in Queue
        </h4>
        <div className="bg-surface-container/60 rounded-2xl p-8 text-center">
          <p className="text-sm text-on-surface-variant">No streams queued</p>
          <Link
            href="/submit"
            className="text-sm text-primary font-bold mt-2 inline-block hover:underline"
          >
            Submit a stream &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-lg font-headline font-bold mb-4 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          queue
        </span>
        Up Next in Queue
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {topThree.map((entry, index) => {
          const name =
            entry.stream?.twitchDisplayName ??
            entry.stream?.twitchUsername ??
            "Unknown";
          const category = entry.stream?.category ?? "Streaming";

          return (
            <div
              key={entry.id}
              className="bg-surface-container p-4 rounded-2xl hover:bg-surface-container-high transition-all cursor-pointer group"
            >
              <div className="relative h-32 mb-4 rounded-xl overflow-hidden bg-surface-container-high">
                {entry.stream?.twitchAvatarUrl ? (
                  <Image
                    src={entry.stream.twitchAvatarUrl}
                    alt={name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                      person
                    </span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold">
                  POS #{index + 1}
                </div>
              </div>
              <h5 className="font-bold text-on-surface truncate">{name}</h5>
              <p className="text-xs text-on-surface-variant">{category}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-center">
        <Link
          href="/schedule"
          className="text-sm text-primary font-bold hover:underline"
        >
          View full schedule &rarr;
        </Link>
      </div>
    </div>
  );
}
