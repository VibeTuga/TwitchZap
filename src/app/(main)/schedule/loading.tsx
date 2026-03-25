import { Skeleton, SkeletonRow } from "@/components/ui/skeleton-card";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Tab bar placeholder */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Queue rows */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
