import { Skeleton } from "@/components/ui/skeleton-card";

export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="bg-surface-container rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/5" />
          </div>
        </div>
      </div>

      {/* Stats row — 4 boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface-container rounded-2xl p-4 space-y-2"
          >
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-7 w-2/3" />
          </div>
        ))}
      </div>

      {/* Zap Points section */}
      <div className="bg-surface-container rounded-2xl p-6 space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-14 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Badges section */}
      <div className="bg-surface-container rounded-2xl p-6 space-y-4">
        <Skeleton className="h-5 w-20" />
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
