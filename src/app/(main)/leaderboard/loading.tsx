import { Skeleton } from "@/components/ui/skeleton-card";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Your Rank card placeholder */}
      <div className="bg-surface-container rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
      </div>

      {/* Filter bar placeholder */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-18 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
        </div>
      </div>

      {/* Rankings rows */}
      <div className="space-y-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-surface-container"
          >
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
