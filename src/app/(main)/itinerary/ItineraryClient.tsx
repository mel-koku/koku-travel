"use client";

import { Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

import { ItineraryShell } from "@/components/features/itinerary/ItineraryShell";
import { ItinerarySkeleton } from "@/components/features/itinerary/ItinerarySkeleton";
import { useSmartPrompts } from "@/components/features/itinerary/SmartPromptsDrawer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAppState } from "@/state/AppState";
import { logger } from "@/lib/logger";
import { MOCK_ITINERARY } from "@/data/mocks/mockItinerary";
import type { Itinerary } from "@/types/itinerary";
import { env } from "@/lib/env";
import { detectGaps, detectGuidanceGaps, type DetectedGap } from "@/lib/smartPrompts/gapDetection";
import { useSmartPromptActions } from "@/hooks/useSmartPromptActions";
import { useDayTripSuggestions } from "@/hooks/useDayTripSuggestions";
import { UnlockCeremony } from "@/components/features/itinerary/UnlockCeremony";
import { useToast } from "@/context/ToastContext";

import { fetchDayGuidance, getCurrentSeason } from "@/lib/tips/guidanceService";
import { parseLocalDate, parseLocalDateWithOffset } from "@/lib/utils/dateUtils";
import type { PagesContent } from "@/types/sanitySiteContent";

type ItineraryClientProps = {
  content?: PagesContent;
  launchPricing?: boolean;
  launchSlotsRemaining?: number;
};

/** Parse YYYY-MM-DD safely to avoid UTC midnight timezone bug */
function parseTripDate(dateStr: string): Date {
  return parseLocalDate(dateStr) ?? new Date();
}

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

function ItineraryPageContent({ content, launchPricing, launchSlotsRemaining }: { content?: PagesContent; launchPricing?: boolean; launchSlotsRemaining?: number }) {
  const searchParams = useSearchParams();
  const requestedTripId = searchParams.get("trip");
  const { trips, updateTripItinerary, user, refreshFromSupabase } = useAppState();
  const { showToast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [guidanceGaps, setGuidanceGaps] = useState<DetectedGap[]>([]);
  const [showCeremony, setShowCeremony] = useState(false);
  const [generationPromise, setGenerationPromise] = useState<Promise<unknown> | null>(null);
  const [generationRetryable, setGenerationRetryable] = useState(false);
  const [generationCostLimited, setGenerationCostLimited] = useState(false);

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

  const runGeneration = useCallback(async () => {
    if (!selectedTrip) return null;
    setGenerationRetryable(false);
    const sessionId = searchParams.get("session_id");
    const verifyRes = await fetch(
      `/api/billing/verify?session_id=${sessionId}&trip_id=${selectedTrip.id}`
    );
    const verifyData = await verifyRes.json();
    if (!verifyData.unlocked) return null;

    const genRes = await fetch("/api/billing/complete-generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: selectedTrip.id }),
    });
    if (!genRes.ok) {
      const body = await genRes.json().catch(() => ({}));
      if (genRes.status === 429) {
        setGenerationCostLimited(true);
        return null;
      }
      if (genRes.status === 502 && body?.retryable) {
        setGenerationRetryable(true);
        return null;
      }
      throw new Error(`complete-generation failed: ${genRes.status}`);
    }
    return genRes.json();
  }, [selectedTrip, searchParams]);

  // Detect return from Stripe checkout (?unlocked=1&session_id=...)
  useEffect(() => {
    const unlocked = searchParams.get("unlocked");
    const sessionId = searchParams.get("session_id");

    if (unlocked === "1" && sessionId && selectedTrip && !selectedTrip.unlockedAt) {
      setGenerationPromise(runGeneration());
      setShowCeremony(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Re-run when selectedTrip finishes loading from async state
  }, [selectedTrip?.id, selectedTrip?.unlockedAt]);

  const handleRetryGeneration = useCallback(() => {
    setGenerationPromise(runGeneration());
  }, [runGeneration]);

  const handleStartUnlock = useCallback(async () => {
    if (!selectedTrip) return;

    // Redirect guests to sign in first, then return here.
    // Guest ID gets rotated to a UUID on first trip creation, so use email presence instead.
    if (!user.email) {
      const returnUrl = `/itinerary?trip=${encodeURIComponent(selectedTrip.id)}`;
      window.location.href = `/signin?next=${encodeURIComponent(returnUrl)}&intent=unlock`;
      return;
    }

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          tripLengthDays: selectedTrip.itinerary.days.length,
          cities: [...new Set(selectedTrip.itinerary.days.map((d) => d.cityId).filter(Boolean))],
          tripDates: (() => {
            const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const start = selectedTrip.builderData?.dates?.start;
            const end = selectedTrip.builderData?.dates?.end;
            if (start && end) return `${fmt(start)} - ${fmt(end)}`;
            if (start) return fmt(start);
            return "";
          })(),
        }),
      });

      if (res.status === 409) {
        try {
          const body = await res.json();
          if (body?.code === "free_access_enabled") {
            showToast(body.error ?? "Trip Pass is free right now.", {
              variant: "info",
              actionLabel: "View itinerary",
              actionHref: selectedTrip ? `/itinerary?trip=${encodeURIComponent(selectedTrip.id)}` : "/dashboard",
            });
            return;
          }
        } catch {
          // fall through to generic error handling
        }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        logger.error("Checkout API error", null, { status: res.status, error: errorData?.error });
        return;
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      logger.error("Checkout network error", err);
    }
  }, [selectedTrip, user.email]);

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
  const tripStartDate = selectedTrip?.builderData?.dates?.start;
  useEffect(() => {
    if (!activeItinerary) {
      setGuidanceGaps([]);
      return;
    }

    let cancelled = false;
    const startDate = tripStartDate ? parseTripDate(tripStartDate) : new Date();

    Promise.all(
      activeItinerary.days.map((day, dayIndex) => {
        const dayDate = tripStartDate
          ? parseLocalDateWithOffset(tripStartDate, dayIndex) ?? new Date()
          : new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + dayIndex);
        return detectGuidanceGaps(day, dayIndex, {
          fetchDayGuidance,
          season: getCurrentSeason(dayDate),
          month: dayDate.getMonth() + 1,
          maxPerDay: 2,
        });
      })
    ).then((results) => {
      if (!cancelled) {
        // Deduplicate across days — keep only the first occurrence of each guidance tip
        const seen = new Set<string>();
        const deduped = results.flat().filter((gap) => {
          const gId = gap.action && "guidanceId" in gap.action ? gap.action.guidanceId : gap.id;
          if (seen.has(gId)) return false;
          seen.add(gId);
          return true;
        });
        setGuidanceGaps(deduped);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeItinerary, tripStartDate]);

  // Merge sync gaps + async guidance gaps
  const initialGaps = useMemo(() => {
    return [...syncGaps, ...guidanceGaps];
  }, [syncGaps, guidanceGaps]);

  const smartPrompts = useSmartPrompts(initialGaps, selectedTripId ?? undefined);

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

  // Memoize used location IDs to avoid new array reference each render
  const usedLocationIds = useMemo(() => getUsedLocationIds(), [getUsedLocationIds]);

  // Day trip suggestions (fetched once on mount)
  const dayTripSuggestions = useDayTripSuggestions(
    activeItinerary,
    selectedTrip?.builderData,
    usedLocationIds,
  );

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
        <h1 className={cn(typography({ intent: "editorial-h2" }), "mb-3")}>Your Itineraries</h1>
        <p>{content?.itineraryEmptyState ?? "No itineraries yet. Build your first trip."}</p>
        <Link href="/trip-builder" className="link-reveal inline-flex min-h-11 items-center px-2 text-sage transition-colors hover:text-sage/80">
          {content?.itineraryBuilderLink ?? "Build a Trip"}
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
          guideProse={selectedTrip?.guideProse}
          dailyBriefings={selectedTrip?.dailyBriefings}
          culturalBriefing={selectedTrip?.culturalBriefing}
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
          dayTripSuggestions={dayTripSuggestions.suggestions}
          onUnlockClick={handleStartUnlock}
          tripUnlocked={!!selectedTrip?.unlockedAt}
          isGuest={!user.email}
          launchPricing={launchPricing}
          launchSlotsRemaining={launchSlotsRemaining}
        />
      </ErrorBoundary>

      <AnimatePresence>
        {showCeremony && generationPromise && selectedTrip && (
          <UnlockCeremony
            cities={[...new Set(selectedTrip.itinerary.days.map((d) => d.cityId).filter(Boolean))] as string[]}
            onComplete={async () => {
              // Pull fresh trip state (with unlocked_at) from Supabase so the
              // UI reflects the unlock without a full page reload.
              await refreshFromSupabase();
              setShowCeremony(false);
              // Clean up the ?unlocked=1&session_id=... query params
              window.history.replaceState(null, "", `/itinerary?trip=${selectedTrip.id}`);
            }}
            generationPromise={generationPromise}
            retryable={generationRetryable}
            costLimited={generationCostLimited}
            onRetry={handleRetryGeneration}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function ItineraryClient({ content, launchPricing, launchSlotsRemaining }: ItineraryClientProps) {
  return (
    <Suspense fallback={<ItinerarySkeleton />}>
      <ItineraryPageContent content={content} launchPricing={launchPricing} launchSlotsRemaining={launchSlotsRemaining} />
    </Suspense>
  );
}
