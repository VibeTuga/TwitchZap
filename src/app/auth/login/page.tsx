"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") || "/";

  async function handleLogin() {
    await signIn("twitch", { callbackUrl: next });
  }

  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-8">
        {error && (
          <div className="mx-auto max-w-sm rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            <p className="font-bold">Authentication failed</p>
            <p className="mt-1 text-red-400/80">
              {errorDescription || error}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-xl bg-primary-dim flex items-center justify-center shadow-[0_0_30px_rgba(170,48,250,0.5)]">
            <span
              className="material-symbols-outlined text-on-primary-fixed text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-headline font-black text-primary">
              TwitchZap
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">
              Community Powered
            </p>
          </div>
        </div>

        <p className="text-on-surface-variant text-lg max-w-sm mx-auto">
          Discover new Twitch streams together. Vote, extend, and earn Zap
          Points.
        </p>

        <button
          onClick={handleLogin}
          className="flex items-center gap-3 mx-auto bg-[#9146FF] hover:bg-[#7c3aed] px-8 py-4 rounded-xl font-headline font-bold text-white transition-all shadow-[0_0_30px_rgba(145,70,255,0.4)] hover:shadow-[0_0_40px_rgba(145,70,255,0.6)] hover:scale-105"
        >
          <svg
            className="w-6 h-6 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
          </svg>
          Sign in with Twitch
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
