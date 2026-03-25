import { Skeleton } from "@/components/ui/skeleton-card";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Global loading bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden bg-surface-container">
        <div className="h-full w-1/3 bg-gradient-to-r from-primary to-primary-dim animate-loading-bar" />
      </div>

      {/* Stream player skeleton */}
      <div className="space-y-4">
        <Skeleton className="w-full aspect-video rounded-2xl" />
      </div>

      {/* Controls overlay skeleton */}
      <div className="bg-surface-container rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>

      {/* Queue skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-high"
          >
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
