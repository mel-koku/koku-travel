"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ItineraryShell } from "@/components/features/itinerary/ItineraryShell";
import { ItinerarySkeleton } from "@/components/features/itinerary/ItinerarySkeleton";
import { useSmartPrompts } from "@/components/features/itinerary/SmartPromptsDrawer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAppState } from "@/state/AppState";
import { MOCK_ITINERARY } from "@/data/mocks/mockItinerary";
import type { Itinerary } from "@/types/itinerary";
import { env } from "@/lib/env";
import { detectGaps, detectGuidanceGaps, type DetectedGap } from "@/lib/smartPrompts/gapDetection";
import { useSmartPromptActions } from "@/hooks/useSmartPromptActions";
import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";
import type { PagesContent } from "@/types/sanitySiteContent";

type ItineraryClientProps = {
  content?: PagesContent;
};

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

function ItineraryPageContent({ content }: { content?: PagesContent }) {
  const searchParams = useSearchParams();
  const requestedTripId = searchParams.get("trip");
  const { trips, updateTripItinerary } = useAppState();
  const [isMounted, setIsMounted] = useState(false);
  const [guidanceGaps, setGuidanceGaps] = useState<DetectedGap[]>([]);

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

  // Detect gaps for smart prompts (sync — meals, experiences, etc.)
  const syncGaps = useMemo(() => {
    if (!activeItinerary) return [];
    return detectGaps(activeItinerary, {
      includeMeals: true,
      includeTransport: false, // Transport gaps can be noisy, disable for now
      includeExperiences: true,
      maxGapsPerDay: 2,
    });
  }, [activeItinerary]);

  // Fetch guidance gaps asynchronously per day
  useEffect(() => {
    if (!activeItinerary) {
      setGuidanceGaps([]);
      return;
    }

    let cancelled = false;
    const season = getCurrentSeason();

    Promise.all(
      activeItinerary.days.map((day, dayIndex) =>
        detectGuidanceGaps(day, dayIndex, {
          fetchDayGuidance,
          season,
          maxPerDay: 2,
        })
      )
    ).then((results) => {
      if (!cancelled) {
        setGuidanceGaps(results.flat());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeItinerary]);

  // Merge sync gaps + async guidance gaps
  const initialGaps = useMemo(() => {
    return [...syncGaps, ...guidanceGaps];
  }, [syncGaps, guidanceGaps]);

  const smartPrompts = useSmartPrompts(initialGaps);

  // Reset prompts when trip changes
  useEffect(() => {
    if (activeItinerary) {
      const newSyncGaps = detectGaps(activeItinerary, {
        includeMeals: true,
        includeTransport: false,
        includeExperiences: true,
        maxGapsPerDay: 2,
      });
      // Include any guidance gaps already fetched
      smartPrompts.resetPrompts([...newSyncGaps, ...guidanceGaps]);
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

  // Wrap confirmPreview to also dismiss the gap from smart prompts
  const handleConfirmPreview = useCallback(() => {
    if (smartPromptActions.previewState) {
      smartPrompts.handleAccept(smartPromptActions.previewState.gap);
    }
    smartPromptActions.confirmPreview();
  }, [smartPromptActions, smartPrompts]);

  // Wait for mount to prevent hydration mismatch
  // AppState loads from localStorage which is only available on client
  if (!isMounted) {
    return (
      <div className="p-16 text-center text-foreground-secondary">
        <p>{content?.itineraryLoadingText ?? "Loading..."}</p>
      </div>
    );
  }

  if (!activeItinerary) {
    return (
      <div className="p-16 text-center text-foreground-secondary">
        <p>{content?.itineraryEmptyState ?? "No itineraries yet. Build a trip and it\u2019ll show up here."}</p>
        <Link href="/trip-builder" className="link-reveal text-sage transition-colors hover:text-sage/80">
          {content?.itineraryBuilderLink ?? "Go to Trip Builder"}
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
          dayIntros={selectedTrip?.dayIntros}
          suggestions={smartPrompts.gaps}
          onAcceptSuggestion={handleSmartPromptAccept}
          onSkipSuggestion={handleSmartPromptSkip}
          loadingSuggestionId={smartPromptActions.loadingGapId}
          previewState={smartPromptActions.previewState}
          onConfirmPreview={handleConfirmPreview}
          onShowAnother={smartPromptActions.showAnother}
          onCancelPreview={smartPromptActions.cancelPreview}
          onFilterChange={smartPromptActions.setRefinementFilter}
          isPreviewLoading={smartPromptActions.isLoading}
        />
      </ErrorBoundary>
    </div>
  );
}

export function ItineraryClient({ content }: ItineraryClientProps) {
  return (
    <Suspense fallback={<ItinerarySkeleton />}>
      <ItineraryPageContent content={content} />
    </Suspense>
  );
}
