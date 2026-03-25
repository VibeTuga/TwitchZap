import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary-dim/20 flex items-center justify-center mx-auto">
          <span
            className="material-symbols-outlined text-primary-dim text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-5xl font-headline font-black text-on-surface">
            404
          </h2>
          <p className="text-on-surface-variant text-sm">
            This page doesn&apos;t exist. Maybe the stream already ended?
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed font-headline font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(170,48,250,0.4)] items-center justify-center"
        >
          Back to Live View
        </Link>
      </div>
    </div>
  );
}
