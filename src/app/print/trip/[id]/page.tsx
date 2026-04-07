"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/state/AppState";
import { PrintBook } from "@/components/print/PrintBook";
import { typography } from "@/lib/typography-system";
import { usePrintEnrichment } from "@/hooks/usePrintEnrichment";

type PrintTripPageProps = {
  params: Promise<{ id: string }>;
};

export default function PrintTripPage({ params }: PrintTripPageProps) {
  const { id } = use(params);
  const { trips } = useAppState();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const trip = trips.find((t) => t.id === id);
  const { enrichment, isLoading } = usePrintEnrichment(trip);

  if (!isMounted) {
    return null;
  }

  if (!trip) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
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
      <PrintToolbar isLoading={isLoading} />
      <PrintBook trip={trip} enrichment={enrichment} />
    </>
  );
}

function PrintToolbar({ isLoading }: { isLoading: boolean }) {
  return (
    <div
      className="print-screen-only fixed right-4 top-4 z-50 flex items-center gap-2 rounded-md border border-border bg-surface/95 px-3 py-2 shadow-(--shadow-card) backdrop-blur"
      aria-hidden="false"
    >
      <button
        type="button"
        onClick={() => window.print()}
        disabled={isLoading}
        className="inline-flex h-9 items-center justify-center rounded-md bg-brand-primary px-4 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-secondary disabled:opacity-50"
      >
        {isLoading ? "Loading..." : "Download PDF"}
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
