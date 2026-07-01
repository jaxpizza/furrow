"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Route-level error boundary — a branded fallback instead of Next's default, so
 *  an unexpected error degrades to a calm "try again" rather than a raw stack. */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-[var(--accent)] text-2xl font-bold tracking-tight">Furrow</div>
      <p className="text-text-secondary max-w-sm text-sm">
        Something went wrong loading this page. Please try again — if it keeps happening, check back shortly.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="border-border hover:bg-accent/60 rounded-md border px-3 py-1.5 text-sm transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="border-border hover:bg-accent/60 rounded-md border px-3 py-1.5 text-sm transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
