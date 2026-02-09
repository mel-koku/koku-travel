"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error for debugging
    logger.error("Dashboard error boundary caught error", error, {
      digest: error.digest,
      componentStack: (error as Error & { componentStack?: string }).componentStack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
          <svg
            className="h-8 w-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="mb-2 font-serif italic text-xl text-foreground">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-stone">
          We encountered an error loading your dashboard. This has been logged and we&apos;ll look into it.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
            Go home
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-xs text-stone hover:text-foreground">
              Error details (dev only)
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface p-3 text-xs text-error">
              {error.message}
              {error.stack && (
                <>
                  {"\n\n"}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
