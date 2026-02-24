"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ItineraryShell } from "@/components/features/itinerary/ItineraryShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Itinerary } from "@/types/itinerary";
import type { TripBuilderData } from "@/types/trip";

type SharedTripData = {
  name: string;
  itinerary: Itinerary;
  builderData: TripBuilderData;
  createdAt: string;
  updatedAt: string;
  shareCreatedAt: string;
  viewCount: number;
};

type SharedClientProps = {
  trip: SharedTripData;
};

const formatDateLabel = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

export function SharedClient({ trip }: SharedClientProps) {
  const itinerary = trip.itinerary;
  const builderData = trip.builderData;

  const createdLabel = formatDateLabel(trip.createdAt);
  const updatedLabel = formatDateLabel(trip.updatedAt);

  const tripStartDate = useMemo(() => {
    return builderData?.dates?.start ?? undefined;
  }, [builderData]);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Minimal branded header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif italic text-xl text-foreground hover:text-brand-primary transition">
              KOKU
            </Link>
            <span className="text-stone">|</span>
            <span className="text-sm text-foreground-secondary">Shared Itinerary</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-mono text-xs text-stone">
              {trip.viewCount} {trip.viewCount === 1 ? "view" : "views"}
            </span>
          </div>
        </div>
      </header>

      {/* Trip name */}
      <div className="mx-auto max-w-screen-2xl px-4 pt-6 sm:px-6">
        <h1 className="font-serif italic text-3xl text-foreground sm:text-4xl">
          {trip.name}
        </h1>
      </div>

      {/* Itinerary shell in read-only mode */}
      <ErrorBoundary>
        <ItineraryShell
          tripId="shared"
          itinerary={itinerary}
          createdLabel={createdLabel}
          updatedLabel={updatedLabel}
          isUsingMock={true}
          isReadOnly={true}
          tripStartDate={tripStartDate}
          tripBuilderData={builderData}
        />
      </ErrorBoundary>

      {/* Footer CTA */}
      <div className="border-t border-border bg-canvas py-12 sm:py-16">
        <div className="mx-auto max-w-screen-2xl px-4 text-center sm:px-6">
          <h2 className="font-serif italic text-2xl text-foreground sm:text-3xl">
            Plan your own Japan trip
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-foreground-secondary">
            Build a personalized itinerary with curated locations, smart scheduling, and local insights.
          </p>
          <Link
            href="/trip-builder"
            className="mt-6 inline-flex items-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98]"
          >
            Start Planning
          </Link>
        </div>
      </div>
    </div>
  );
}
