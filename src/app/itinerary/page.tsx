"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Force dynamic rendering since we use useSearchParams()
export const dynamic = "force-dynamic";

import { ItineraryShell } from "@/components/features/itinerary/ItineraryShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAppState } from "@/state/AppState";
import { MOCK_ITINERARY } from "@/data/mocks/mockItinerary";
import type { Itinerary } from "@/types/itinerary";
import { env } from "@/lib/env";

const formatDateLabel = (iso: string | undefined) => {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

function ItineraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const requestedTripId = searchParams.get("trip");
  const { trips, updateTripItinerary } = useAppState();
  const [userSelectedTripId, setUserSelectedTripId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state to prevent hydration mismatch
  // AppState loads from localStorage in useEffect, so trips may be empty on server
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedTripId = useMemo(() => {
    if (!trips.length) {
      return null;
    }
    if (
      userSelectedTripId &&
      trips.some((trip) => trip.id === userSelectedTripId)
    ) {
      return userSelectedTripId;
    }
    if (
      requestedTripId &&
      trips.some((trip) => trip.id === requestedTripId)
    ) {
      return requestedTripId;
    }
    return trips[0]?.id ?? null;
  }, [requestedTripId, trips, userSelectedTripId]);

  const isUsingMock = trips.length === 0 && env.useMockItinerary;

  const handleTripChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value || null;
      setUserSelectedTripId(nextId);

      const params = new URLSearchParams(searchParamsString);
      if (nextId) {
        params.set("trip", nextId);
      } else {
        params.delete("trip");
      }
      const query = params.toString();
      router.replace(query.length > 0 ? `/itinerary?${query}` : "/itinerary", {
        scroll: false,
      });
    },
    [router, searchParamsString],
  );

  const handleItineraryChange = useCallback(
    (next: Itinerary) => {
      if (!selectedTripId) {
        return;
      }
      updateTripItinerary(selectedTripId, next);
    },
    [selectedTripId, updateTripItinerary],
  );

  const selectedTrip = selectedTripId
    ? trips.find((trip) => trip.id === selectedTripId)
    : null;


  const activeItinerary: Itinerary | null = selectedTrip
    ? selectedTrip.itinerary
    : isUsingMock
      ? MOCK_ITINERARY
      : null;

  const createdLabel =
    selectedTrip?.createdAt ? formatDateLabel(selectedTrip.createdAt) : null;
  const updatedLabel =
    selectedTrip?.updatedAt && selectedTrip.updatedAt !== selectedTrip?.createdAt
      ? formatDateLabel(selectedTrip.updatedAt)
      : null;

  // Wait for mount to prevent hydration mismatch
  // AppState loads from localStorage which is only available on client
  if (!isMounted) {
    return (
      <div className="p-16 text-center text-foreground-secondary">
        <p>Loading...</p>
      </div>
    );
  }

  if (!activeItinerary) {
    return (
      <div className="p-16 text-center text-foreground-secondary">
        <p>No saved itineraries yet. Confirm a trip in the builder to see it here.</p>
        <Link href="/trip-builder" className="text-sage underline">
          Go to Trip Builder
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface py-6 sm:py-8 md:py-10">
      <ErrorBoundary>
        <ItineraryShell
          key={selectedTrip?.id ?? "mock-itinerary"}
          itinerary={activeItinerary}
          tripId={selectedTrip?.id ?? "mock"}
          onItineraryChange={selectedTrip ? handleItineraryChange : undefined}
          selectedTripId={selectedTripId}
          onTripChange={handleTripChange}
          trips={trips}
          headingText={trips.length > 1 ? "Your Itineraries" : "Your Itinerary"}
          descriptionText="Choose a saved trip to review or continue planning."
          createdLabel={createdLabel}
          updatedLabel={updatedLabel}
          isUsingMock={isUsingMock}
          tripStartDate={selectedTrip?.builderData?.dates?.start}
          tripBuilderData={selectedTrip?.builderData}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function ItineraryPage() {
  return (
    <Suspense fallback={
      <div className="p-16 text-center text-foreground-secondary">
        <p>Loading...</p>
      </div>
    }>
      <ItineraryPageContent />
    </Suspense>
  );
}
