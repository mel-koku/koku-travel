"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/state/AppState";
import { PrintBook } from "@/components/print/PrintBook";
import { typography } from "@/lib/typography-system";

type PrintTripPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Print route — renders a single trip as an A5 editorial book.
 *
 * This is a client component because trip data (including LLM-generated
 * guide prose and daily briefings) lives in AppState/localStorage, not
 * Supabase. Server-side rendering would produce empty books.
 *
 * The route is noindex (see parent print/layout.tsx) and shows a
 * floating "Download PDF" affordance that triggers the browser's
 * native print dialog. Phase 1 uses browser print; Phase 2 will add
 * server-side Playwright rendering.
 */
export default function PrintTripPage({ params }: PrintTripPageProps) {
  const { id } = use(params);
  const { trips } = useAppState();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const trip = trips.find((t) => t.id === id);

  if (!isMounted) {
    // Avoid hydration mismatch — AppState loads from localStorage in an effect
    return null;
  }

  if (!trip) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className={typography({ intent: "editorial-h2" })}>
          This trip couldn&apos;t be found
        </h1>
        <p className={typography({ intent: "utility-body-muted" })}>
          It may be stored on another device, or you may need to sign in.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand-primary px-6 text-sm font-semibold text-white"
        >
          Return to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <PrintToolbar />
      <PrintBook trip={trip} />
    </>
  );
}

function PrintToolbar() {
  return (
    <div
      className="print-screen-only fixed right-4 top-4 z-50 flex items-center gap-2 rounded-md border border-border bg-surface/95 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur"
      aria-hidden="false"
    >
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center justify-center rounded-md bg-brand-primary px-4 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-secondary"
      >
        Download PDF
      </button>
      <Link
        href="/itinerary"
        className="inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-semibold uppercase tracking-wide text-foreground-secondary hover:text-foreground"
      >
        Close
      </Link>
    </div>
  );
}
