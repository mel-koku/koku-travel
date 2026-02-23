"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function VariantBError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Variant B error boundary triggered", error, {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6">
      <div
        className="w-full rounded-2xl bg-white p-8 text-center"
        style={{ maxWidth: "28rem", boxShadow: "var(--shadow-card)" }}
      >
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[var(--foreground)]">
          Something went wrong
        </h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          We encountered an unexpected error. Please try again or return to the
          home page.
        </p>
        {process.env.NODE_ENV !== "production" && error.message && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-left">
            <p className="text-sm font-semibold text-red-600">Error details:</p>
            <p className="mt-1 text-sm text-red-500">{error.message}</p>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-medium text-white transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
          >
            Try again
          </button>
          <a
            href="/b/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-6 text-sm font-medium text-[var(--foreground)] transition-shadow hover:shadow-[var(--shadow-sm)]"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
