"use client";

interface ZapPointsProps {
  points: number;
  className?: string;
}

export function ZapPoints({ points, className = "" }: ZapPointsProps) {
  return (
    <div
      className={`flex items-center gap-2 bg-primary-dim/10 px-4 py-2 rounded-full border border-primary-dim/20 ${className}`}
    >
      <span className="material-symbols-outlined text-primary-dim text-lg">
        bolt
      </span>
      <span className="text-sm font-semibold text-primary">
        {points.toLocaleString()}
      </span>
    </div>
  );
}
