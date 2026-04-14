"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { typography } from "@/lib/typography-system";

export default function PrintError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Print route error boundary triggered", error, {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
      route: "/print/trip/[id]",
    });
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 print:hidden">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className={`mb-4 ${typography({ intent: "editorial-h2" })}`}>
          This book couldn&apos;t be built
        </h1>
        <p className="mb-6 text-foreground-secondary">
          Something went wrong while preparing the printable version of your
          trip. Open the trip in the app and try again, or come back in a
          minute.
        </p>
        {process.env.NODE_ENV !== "production" && error.message && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-left">
            <p className="text-sm font-semibold text-destructive">
              Error details:
            </p>
            <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-destructive">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white transition hover:bg-brand-primary/90 active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href="/itinerary"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-surface active:scale-[0.98]"
          >
            Back to itinerary
          </Link>
        </div>
      </div>
    </div>
  );
}
