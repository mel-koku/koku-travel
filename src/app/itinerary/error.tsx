"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error using centralized logger
    logger.error("Itinerary page error boundary triggered", error, {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-md">
        <div className="text-center">
          <h1 className="mb-4 font-serif italic text-3xl text-foreground">Something went wrong</h1>
          <p className="mb-6 text-foreground-secondary">
            We could not load your itinerary. Try again or start building a new trip.
          </p>
          {process.env.NODE_ENV !== "production" && error.message && (
            <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-left">
              <p className="text-sm font-semibold text-destructive">Error details:</p>
              <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-xs text-destructive">Error ID: {error.digest}</p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset} variant="primary">
              Try again
            </Button>
            <Button asChild href="/trip-builder" variant="secondary">
              Build new trip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
