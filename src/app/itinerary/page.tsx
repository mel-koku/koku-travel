"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

// Force dynamic rendering since we use useSearchParams()
export const dynamic = "force-dynamic";

import { ItineraryShell } from "@/components/features/itinerary/ItineraryShell";
import { ItinerarySkeleton } from "@/components/features/itinerary/ItinerarySkeleton";
import { useSmartPrompts } from "@/components/features/itinerary/SmartPromptsDrawer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAppState } from "@/state/AppState";
import { MOCK_ITINERARY } from "@/data/mocks/mockItinerary";
import type { Itinerary } from "@/types/itinerary";
import { env } from "@/lib/env";
import { detectGaps, type DetectedGap } from "@/lib/smartPrompts/gapDetection";
import { useSmartPromptActions } from "@/hooks/useSmartPromptActions";

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
  const searchParams = useSearchParams();
  const requestedTripId = searchParams.get("trip");
  const { trips, updateTripItinerary } = useAppState();
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
      requestedTripId &&
      trips.some((trip) => trip.id === requestedTripId)
    ) {
      return requestedTripId;
    }
    return trips[0]?.id ?? null;
  }, [requestedTripId, trips]);

  const isUsingMock = trips.length === 0 && env.useMockItinerary;

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

  // Detect gaps for smart prompts
  const initialGaps = useMemo(() => {
    if (!activeItinerary) return [];
    return detectGaps(activeItinerary, {
      includeMeals: true,
      includeTransport: false, // Transport gaps can be noisy, disable for now
      includeExperiences: true,
      maxGapsPerDay: 2,
    });
  }, [activeItinerary]);

  const smartPrompts = useSmartPrompts(initialGaps);

  // Reset prompts when trip changes
  useEffect(() => {
    if (activeItinerary) {
      const newGaps = detectGaps(activeItinerary, {
        includeMeals: true,
        includeTransport: false,
        includeExperiences: true,
        maxGapsPerDay: 2,
      });
      smartPrompts.resetPrompts(newGaps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only reset on trip change, not on every itinerary update
  }, [selectedTripId]);

  // Helper functions for smart prompt actions
  const getDay = useCallback((dayId: string) => {
    return activeItinerary?.days.find((d) => d.id === dayId);
  }, [activeItinerary]);

  const getUsedLocationIds = useCallback(() => {
    if (!activeItinerary) return [];
    return activeItinerary.days.flatMap((day) =>
      day.activities
        .filter((a): a is Extract<typeof a, { kind: "place" }> => a.kind === "place")
        .map((a) => a.locationId)
        .filter((id): id is string => Boolean(id))
    );
  }, [activeItinerary]);

  // Smart prompt actions hook
  const smartPromptActions = useSmartPromptActions(
    selectedTrip?.id ?? null,
    selectedTrip?.builderData,
    getDay,
    getUsedLocationIds
  );

  const handleSmartPromptAccept = useCallback(async (gap: DetectedGap) => {
    const result = await smartPromptActions.acceptGap(gap);
    if (result.success) {
      smartPrompts.handleAccept(gap);
    }
    return result;
  }, [smartPromptActions, smartPrompts]);

  const handleSmartPromptSkip = useCallback((gap: DetectedGap) => {
    smartPrompts.handleSkip(gap);
  }, [smartPrompts]);

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
    <div className="bg-surface pb-6 sm:pb-8 md:pb-10">
      <ErrorBoundary>
        <ItineraryShell
          key={selectedTrip?.id ?? "mock-itinerary"}
          itinerary={activeItinerary}
          tripId={selectedTrip?.id ?? "mock"}
          onItineraryChange={selectedTrip ? handleItineraryChange : undefined}
          createdLabel={createdLabel}
          updatedLabel={updatedLabel}
          isUsingMock={isUsingMock}
          tripStartDate={selectedTrip?.builderData?.dates?.start}
          tripBuilderData={selectedTrip?.builderData}
          suggestions={smartPrompts.gaps}
          onAcceptSuggestion={handleSmartPromptAccept}
          onSkipSuggestion={handleSmartPromptSkip}
          loadingSuggestionId={smartPromptActions.loadingGapId}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function ItineraryPage() {
  return (
    <Suspense fallback={<ItinerarySkeleton />}>
      <ItineraryPageContent />
    </Suspense>
  );
}
