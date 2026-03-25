"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-error-container/20 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-error text-3xl">
            error
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-headline font-bold text-on-surface">
            Something went wrong
          </h2>
          <p className="text-on-surface-variant text-sm">
            We hit an unexpected error. This has been logged and we&apos;ll look
            into it.
          </p>
        </div>
        <button
          onClick={reset}
          className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-on-primary-fixed font-headline font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(170,48,250,0.4)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
