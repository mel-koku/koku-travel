"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { durationFast, durationSlow, easeReveal, easePageTransitionMut } from "@/lib/motion";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/cn";
import { useAppState } from "@/state/AppState";
import type { Itinerary, ItineraryActivity, ItineraryDay } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { EntryPoint, TripBuilderData } from "@/types/trip";
import type { GeneratedGuide } from "@/types/llmConstraints";
import { DaySelector } from "./DaySelector";
import { LocationSearchBar } from "./LocationSearchBar";
import { DayRefinementButtons } from "./DayRefinementButtons";
import { ItineraryTimeline } from "./ItineraryTimeline";
import { WhatsNextCard } from "./WhatsNextCard";
import { ItineraryMapPanel } from "./ItineraryMapPanel";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ActivityReplacementPicker } from "./ActivityReplacementPicker";
import {
  useReplacementCandidates,
  locationToActivity,
  type ReplacementCandidate,
} from "@/hooks/useReplacementCandidates";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import { detectItineraryConflicts, getDayConflicts } from "@/lib/validation/itineraryConflicts";
import type { AcceptGapResult, PreviewState, RefinementFilters } from "@/hooks/useSmartPromptActions";
import { TripConfidenceDashboard } from "./TripConfidenceDashboard";
import { calculateTripHealth, getHealthLevel } from "@/lib/itinerary/tripHealth";
import { useItineraryPlanning } from "./hooks/useItineraryPlanning";
import { useItineraryScrollSync } from "./hooks/useItineraryScrollSync";
import { useItineraryGuide } from "./hooks/useItineraryGuide";
import { ShareButton } from "./ShareButton";
import { SeasonalBanner } from "./SeasonalBanner";
import { DayTripBanner } from "./DayTripBanner";
import { useActivityRatings } from "@/hooks/useActivityRatings";
import { ActivityRatingsProvider } from "./ActivityRatingsContext";
import { PrintHeader } from "./PrintHeader";
import { PrintFooter } from "./PrintFooter";
import { REGIONS } from "@/data/regions";
import { useItineraryDiscover } from "./hooks/useItineraryDiscover";
import { ItineraryDiscoverPanel } from "./ItineraryDiscoverPanel";

const DiscoverMap = dynamic(
  () => import("@/components/features/discover/DiscoverMap").then((m) => ({ default: m.DiscoverMap })),
  { ssr: false },
);

type ItineraryViewMode = "timeline" | "dashboard" | "discover";

const LocationExpanded = dynamic(
  () => import("@/components/features/places/LocationExpanded").then((m) => ({ default: m.LocationExpanded })),
  { ssr: false },
);

type ItineraryShellProps = {
  tripId: string;
  itinerary: Itinerary;
  onItineraryChange?: (next: Itinerary) => void;
  headingRef?: RefObject<HTMLHeadingElement>;
  createdLabel: string | null;
  updatedLabel: string | null;
  isUsingMock: boolean;
  isReadOnly?: boolean;
  tripStartDate?: string; // ISO date string (yyyy-mm-dd)
  tripBuilderData?: TripBuilderData;
  dayIntros?: Record<string, string>;
  guideProse?: GeneratedGuide;
  // Smart suggestions (all days)
  suggestions?: DetectedGap[];
  onAcceptSuggestion?: (gap: DetectedGap) => Promise<AcceptGapResult>;
  onSkipSuggestion?: (gap: DetectedGap) => void;
  loadingSuggestionId?: string | null;
  // Preview props
  previewState?: PreviewState | null;
  onConfirmPreview?: () => void;
  onShowAnother?: () => Promise<void>;
  onCancelPreview?: () => void;
  onFilterChange?: (filter: Partial<RefinementFilters>) => void;
  isPreviewLoading?: boolean;
  dayTripSuggestions?: import("@/types/dayTrips").DayTripSuggestion[];
};

export const ItineraryShell = ({
  itinerary,
  tripId,
  onItineraryChange,
  headingRef,
  createdLabel,
  updatedLabel,
  isUsingMock,
  isReadOnly,
  tripStartDate,
  tripBuilderData,
  dayIntros,
  guideProse,
  suggestions,
  onAcceptSuggestion,
  onSkipSuggestion,
  loadingSuggestionId,
  previewState,
  onConfirmPreview,
  onShowAnother,
  onCancelPreview,
  onFilterChange,
  isPreviewLoading,
  dayTripSuggestions,
}: ItineraryShellProps) => {
  const { reorderActivities, replaceActivity, addActivity, getTripById, dayEntryPoints, cityAccommodations, setDayEntryPoint, setCityAccommodation, undo, redo, canUndo, canRedo } = useAppState();

  // Planning hook — model state, travel-time replanning, route optimization
  const {
    model,
    setModelState,
    isPlanning,
    setIsPlanning,
    planningError,
    setPlanningError,
    applyModelUpdate,
    scheduleUserPlanning,
    scheduleUserPlanningRef,
    skipAutoOptimizeRef,
  } = useItineraryPlanning({
    itinerary,
    tripBuilderData,
    dayEntryPoints,
    cityAccommodations,
    tripId,
    onItineraryChange,
  });

  const [selectedDay, setSelectedDay] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ItineraryViewMode>("timeline");
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const lastScrollTopRef = useRef(0);
  const headerCooldownRef = useRef(false);
  const [replacementActivityId, setReplacementActivityId] = useState<string | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<ReplacementCandidate[]>([]);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(null);

  const internalHeadingRef = useRef<HTMLHeadingElement>(null);
  const finalHeadingRef = headingRef ?? internalHeadingRef;

  // Mutation hook for fetching replacement candidates
  const replacementMutation = useReplacementCandidates();
  const isLoadingReplacements = replacementMutation.isPending;

  const currentTrip = useMemo(() => {
    return tripId && !isUsingMock ? getTripById(tripId) : null;
  }, [tripId, isUsingMock, getTripById]);

  const handleReorder = useCallback(
    (dayId: string, activityIds: string[]) => {
      if (tripId && !isUsingMock) {
        reorderActivities(tripId, dayId, activityIds);
      }
    },
    [tripId, isUsingMock, reorderActivities],
  );

  const handleReplace = useCallback(
    (activityId: string) => {
      if (!tripId || isUsingMock || !currentTrip) return;

      const currentDay = model.days[selectedDay];
      if (!currentDay) return;

      const activity = currentDay.activities.find((a) => a.id === activityId);
      if (!activity || activity.kind !== "place") return;

      setReplacementActivityId(activityId);

      // Find replacement candidates via API
      replacementMutation.mutate(
        {
          activity,
          tripData: currentTrip.builderData,
          allActivities: model.days.flatMap((d) => d.activities),
          dayActivities: currentDay.activities,
          currentDayIndex: selectedDay,
          maxCandidates: 10,
        },
        {
          onSuccess: (options) => {
            setReplacementCandidates(options.candidates);
          },
          onError: (error) => {
            logger.error("Failed to find replacement candidates", error);
            setReplacementCandidates([]);
          },
        },
      );
    },
    [tripId, isUsingMock, currentTrip, model, selectedDay, replacementMutation],
  );

  const handleReplaceSelect = useCallback(
    (candidate: ReplacementCandidate) => {
      if (!tripId || isUsingMock || !replacementActivityId) return;

      const currentDay = model.days[selectedDay];
      if (!currentDay) return;

      const activity = currentDay.activities.find((a) => a.id === replacementActivityId);
      if (!activity || activity.kind !== "place") return;

      const newActivity = locationToActivity(candidate.location, activity);

      if (tripId && !isUsingMock) {
        replaceActivity(tripId, currentDay.id, replacementActivityId, newActivity);
      }

      // Build the updated itinerary for replanning
      const nextDays = model.days.map((d) => {
        if (d.id !== currentDay.id) return d;
        return {
          ...d,
          activities: d.activities.map((a) => (a.id === replacementActivityId ? newActivity : a)),
        };
      });
      const nextItinerary = { ...model, days: nextDays };

      // Update local model
      setModelState(nextItinerary);

      // Schedule replanning after state update to recalculate travel times
      setTimeout(() => {
        scheduleUserPlanningRef.current?.(nextItinerary);
      }, 0);

      setReplacementActivityId(null);
      setReplacementCandidates([]);
    },
    [tripId, isUsingMock, replacementActivityId, model, selectedDay, replaceActivity, setModelState, scheduleUserPlanningRef],
  );

  useEffect(() => {
    if (finalHeadingRef.current) {
      finalHeadingRef.current.focus();
    }
  }, [finalHeadingRef]);

  // Keyboard shortcuts for undo/redo (Cmd+Z / Cmd+Shift+Z / Cmd+Y)
  useEffect(() => {
    if (!tripId || isUsingMock || isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const isCmd = e.metaKey || e.ctrlKey;
      if (!isCmd) return;

      if (e.key === "z" && !e.shiftKey) {
        if (canUndo(tripId)) { e.preventDefault(); undo(tripId); }
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        if (canRedo(tripId)) { e.preventDefault(); redo(tripId); }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tripId, isUsingMock, isReadOnly, undo, redo, canUndo, canRedo]);

  // Header collapse on scroll (scroll down → collapse title, scroll up → expand)
  useEffect(() => {
    const el = document.querySelector("[data-itinerary-activities]");
    if (!el) return;

    const THRESHOLD = 30;
    const COOLDOWN_MS = 300;
    const handleScroll = () => {
      if (headerCooldownRef.current) return;
      const top = el.scrollTop;
      const delta = top - lastScrollTopRef.current;

      if (top < 10) {
        setHeaderCollapsed(false);
        lastScrollTopRef.current = top;
        return;
      }

      const nearBottom = el.scrollHeight - top - el.clientHeight < 50;
      if (nearBottom) {
        lastScrollTopRef.current = top;
        return;
      }

      if (delta > THRESHOLD) {
        setHeaderCollapsed(true);
        lastScrollTopRef.current = top;
        headerCooldownRef.current = true;
        setTimeout(() => { headerCooldownRef.current = false; }, COOLDOWN_MS);
      } else if (delta < -THRESHOLD) {
        setHeaderCollapsed(false);
        lastScrollTopRef.current = top;
        headerCooldownRef.current = true;
        setTimeout(() => { headerCooldownRef.current = false; }, COOLDOWN_MS);
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const days = model.days ?? [];
  const safeSelectedDay =
    days.length === 0 ? 0 : Math.min(selectedDay, Math.max(days.length - 1, 0));
  const currentDay = days[safeSelectedDay];
  const currentDayEntryPoints =
    tripId && currentDay?.id ? dayEntryPoints[`${tripId}-${currentDay.id}`] : undefined;

  // Resolve start/end locations for the current day
  const resolvedStartLocation = useMemo(() => {
    if (!tripId || !currentDay) return undefined;
    // Priority 1: Explicit per-day start
    const dayEP = dayEntryPoints[`${tripId}-${currentDay.id}`];
    if (dayEP?.startPoint?.type === "accommodation") return dayEP.startPoint;
    // Priority 2: City-level accommodation
    const effectiveCityId = currentDay.baseCityId ?? currentDay.cityId;
    if (effectiveCityId) {
      const cityAccom = cityAccommodations[`${tripId}-${effectiveCityId}`];
      if (cityAccom) return cityAccom.entryPoint;
    }
    return undefined;
  }, [tripId, currentDay, dayEntryPoints, cityAccommodations]);

  const resolvedEndLocation = useMemo(() => {
    if (!tripId || !currentDay) return undefined;
    // Priority 1: Explicit per-day end
    const dayEP = dayEntryPoints[`${tripId}-${currentDay.id}`];
    if (dayEP?.endPoint?.type === "accommodation") return dayEP.endPoint;
    // Priority 2: City-level accommodation (same as start)
    const effectiveCityId = currentDay.baseCityId ?? currentDay.cityId;
    if (effectiveCityId) {
      const cityAccom = cityAccommodations[`${tripId}-${effectiveCityId}`];
      if (cityAccom) return cityAccom.entryPoint;
    }
    return undefined;
  }, [tripId, currentDay, dayEntryPoints, cityAccommodations]);

  // Effective map entry points — merge explicit overrides with resolved locations
  const effectiveMapStartPoint = currentDayEntryPoints?.startPoint ?? resolvedStartLocation;
  // End defaults to same as start when not explicitly set
  const effectiveMapEndPoint = currentDayEntryPoints?.endPoint ?? resolvedEndLocation ?? resolvedStartLocation;

  // Handler: set start location for this day
  const handleStartLocationChange = useCallback(
    (location: EntryPoint | undefined) => {
      if (!tripId || !currentDay?.id) return;
      setDayEntryPoint(tripId, currentDay.id, "start", location);
      // If end isn't explicitly set, it defaults to same as start (via resolution logic)
    },
    [tripId, currentDay, setDayEntryPoint],
  );

  // Handler: set end location for this day
  const handleEndLocationChange = useCallback(
    (location: EntryPoint | undefined) => {
      if (!tripId || !currentDay?.id) return;
      setDayEntryPoint(tripId, currentDay.id, "end", location);
    },
    [tripId, currentDay, setDayEntryPoint],
  );

  // Handler: set accommodation for all days in this city
  const handleCityAccommodationChange = useCallback(
    (location: EntryPoint | undefined) => {
      if (!tripId || !currentDay) return;
      const effectiveCityId = currentDay.baseCityId ?? currentDay.cityId;
      if (!effectiveCityId) return;

      if (location) {
        setCityAccommodation(tripId, effectiveCityId, {
          cityId: effectiveCityId,
          entryPoint: location,
        });
      } else {
        setCityAccommodation(tripId, effectiveCityId, undefined);
      }
    },
    [tripId, currentDay, setCityAccommodation],
  );

  // Filter suggestions for the current day
  const currentDaySuggestions = useMemo(() => {
    if (!suggestions || !currentDay) return [];
    return suggestions.filter((gap) => gap.dayIndex === safeSelectedDay);
  }, [suggestions, currentDay, safeSelectedDay]);

  // Detect scheduling conflicts in the itinerary
  const conflictsResult = useMemo(() => {
    return detectItineraryConflicts(model);
  }, [model]);

  // Compute trip health and per-day levels for DaySelector dots
  const tripHealth = useMemo(() => {
    return calculateTripHealth(model, conflictsResult.conflicts);
  }, [model, conflictsResult]);

  const dayHealthLevels = useMemo(() => {
    return tripHealth.days.map((d) => getHealthLevel(d.score));
  }, [tripHealth]);

  // Guide hook — lazy-loads ~90KB of template data
  const { currentDayGuide } = useItineraryGuide(model, tripBuilderData, dayIntros, currentDay?.id, guideProse);

  // Get conflicts for the current day
  const currentDayConflicts = useMemo(() => {
    if (!currentDay) return [];
    return getDayConflicts(conflictsResult, currentDay.id);
  }, [conflictsResult, currentDay]);

  // Scroll sync hook — IntersectionObserver-based activity highlighting
  const { selectedActivityId, setSelectedActivityId, handleSelectActivity } =
    useItineraryScrollSync(safeSelectedDay);

  const [dayTransitionLabel, setDayTransitionLabel] = useState<string | null>(null);

  const handleSelectDayChange = useCallback((dayIndex: number) => {
    const targetDay = model.days[dayIndex];
    if (targetDay?.dateLabel) {
      const cityName = targetDay.dateLabel.replace(/Day \d+\s*(\(([^)]+)\))?/, "$2").trim();
      if (cityName) {
        setDayTransitionLabel(cityName);
        setTimeout(() => setDayTransitionLabel(null), 500);
      }
    }
    setSelectedDay(dayIndex);
    setSelectedActivityId(null);
  }, [model.days, setSelectedActivityId]);

  // Wrapper for onAcceptSuggestion - the prop change from AppState will trigger
  // replanning via the serializedItinerary effect
  const handleAcceptSuggestion = useCallback(
    async (gap: DetectedGap) => {
      if (!onAcceptSuggestion) return;

      const result = await onAcceptSuggestion(gap);

      // Activity was added to AppState. The itinerary prop will update and trigger
      // the effect which calls planItineraryClient to recalculate times.
      if (result.success) {
        // Force immediate UI update by triggering planning indicator
        setIsPlanning(true);
      }
    },
    [onAcceptSuggestion, setIsPlanning],
  );

  const handleViewDetails = useCallback((location: Location) => {
    setExpandedLocation(location);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedLocation(null);
  }, []);

  // ── Add activity from location search ──
  const handleAddSearchedActivity = useCallback(
    (newActivity: Extract<ItineraryActivity, { kind: "place" }>) => {
      if (!tripId || isUsingMock || !currentDay) return;

      addActivity(tripId, currentDay.id, newActivity);

      const nextDays = model.days.map((d) => {
        if (d.id !== currentDay.id) return d;
        return { ...d, activities: [...d.activities, newActivity] };
      });
      const nextItinerary = { ...model, days: nextDays };

      setModelState(nextItinerary);

      setTimeout(() => {
        scheduleUserPlanningRef.current?.(nextItinerary);
      }, 0);
    },
    [tripId, isUsingMock, currentDay, model, addActivity, setModelState, scheduleUserPlanningRef],
  );

  // ── Refine day (Adjust button) ──
  const handleRefineDay = useCallback(
    (refinedDay: ItineraryDay) => {
      const nextItinerary = {
        ...model,
        days: model.days.map((d, i) => (i === safeSelectedDay ? refinedDay : d)),
      };
      setModelState(nextItinerary);
      setTimeout(() => {
        scheduleUserPlanningRef.current?.(nextItinerary);
      }, 0);
    },
    [model, safeSelectedDay, setModelState, scheduleUserPlanningRef],
  );

  // ── Day trip accept handler ──
  const [isAcceptingDayTrip, setIsAcceptingDayTrip] = useState(false);

  const handleAcceptDayTrip = useCallback(
    async (suggestion: import("@/types/dayTrips").DayTripSuggestion) => {
      if (!onItineraryChange) return;
      setIsAcceptingDayTrip(true);
      try {
        // Find a suitable day in the base city to swap (prefer last day in that city)
        const candidateDays = model.days
          .map((d, i) => ({ day: d, index: i }))
          .filter((d) => d.day.cityId === suggestion.baseCityId && !d.day.isDayTrip);
        if (candidateDays.length === 0) return;
        const target = candidateDays[candidateDays.length - 1]!;

        const res = await fetch("/api/day-trips/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseCityId: suggestion.baseCityId,
            targetLocationId: suggestion.targetLocationId,
            dayIndex: target.index,
            dayId: target.day.id,
            vibes: tripBuilderData?.vibes || [],
            usedLocationIds: model.days.flatMap((d) =>
              d.activities
                .filter((a): a is Extract<typeof a, { kind: "place" }> => a.kind === "place")
                .map((a) => a.locationId)
                .filter(Boolean),
            ),
            tripDate: tripStartDate,
          }),
        });

        if (!res.ok) return;
        const plan = await res.json();

        // Replace the target day's activities with day trip activities
        const nextDays = [...model.days];
        nextDays[target.index] = {
          ...target.day,
          activities: plan.activities,
          isDayTrip: true,
          baseCityId: suggestion.baseCityId,
          cityId: plan.targetCityId || suggestion.targetCity.toLowerCase(),
          dayTripTravelMinutes: plan.totalTravelMinutes,
          dateLabel: plan.dayLabel || `Day ${target.index + 1} (Day Trip: ${suggestion.baseCityName} \u2192 ${suggestion.targetLocationName})`,
        };

        const nextItinerary = { ...model, days: nextDays };
        setModelState(nextItinerary);
        setTimeout(() => {
          scheduleUserPlanningRef.current?.(nextItinerary);
        }, 0);
      } finally {
        setIsAcceptingDayTrip(false);
      }
    },
    [model, onItineraryChange, tripBuilderData, tripStartDate, setModelState, scheduleUserPlanningRef],
  );

  // ── Discover mode ──
  const discover = useItineraryDiscover({
    model,
    currentDay,
    dayIndex: safeSelectedDay,
  });

  const handleAddDiscoverActivity = useCallback(
    (location: Location) => {
      const newActivity = discover.buildActivity(location);
      handleAddSearchedActivity(newActivity);
    },
    [discover, handleAddSearchedActivity],
  );

  // Activity ratings
  const activityRatingsHook = useActivityRatings(tripId && !isUsingMock && !isReadOnly ? tripId : undefined);
  useEffect(() => {
    if (tripId && !isUsingMock && !isReadOnly) {
      activityRatingsHook.fetchRatings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, isUsingMock, isReadOnly]);

  const ratingsContextValue = useMemo(() => ({
    ratings: activityRatingsHook.ratings,
    submitRating: activityRatingsHook.submitRating,
  }), [activityRatingsHook.ratings, activityRatingsHook.submitRating]);

  // Print export data
  const printCities = useMemo(() => {
    const cityMap: Record<string, string> = {};
    for (const region of REGIONS) {
      for (const city of region.cities) {
        cityMap[city.id] = city.name;
      }
    }
    const ids = [...new Set(itinerary.days.map((d) => d.cityId).filter((c): c is string => Boolean(c)))];
    return ids.map((id) => cityMap[id] ?? id);
  }, [itinerary.days]);

  const printDateRange = useMemo(() => {
    const start = tripBuilderData?.dates?.start;
    const end = tripBuilderData?.dates?.end;
    if (!start || !end) return undefined;
    const fmt = (iso: string) => parseLocalDate(iso)!.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [tripBuilderData?.dates]);

  const tripName = useMemo(() => {
    const stored = getTripById?.(tripId);
    return stored?.name ?? "My Japan Trip";
  }, [getTripById, tripId]);

  const totalActivities = useMemo(
    () => days.reduce((sum, d) => sum + d.activities.filter((a) => a.kind === "place").length, 0),
    [days]
  );

  return (
    <ActivityRatingsProvider value={!isReadOnly ? ratingsContextValue : null}>
    <PrintHeader tripName={tripName} dateRange={printDateRange} cities={printCities} />
    <section className="mx-auto min-h-[calc(100dvh-80px)] max-w-screen-2xl">
      {/* ── Mobile peek map strip (< lg) ── */}
      <div className="relative lg:hidden">
        <motion.div
          animate={{ height: viewMode === "discover" ? "50vh" : mapExpanded ? "100dvh" : "30vh" }}
          transition={{
            duration: durationSlow,
            ease: easePageTransitionMut,
          }}
          className={mapExpanded ? "relative overflow-hidden pt-[env(safe-area-inset-top)]" : "relative overflow-hidden"}
        >
          <ErrorBoundary fallback={<div className="flex h-full items-center justify-center text-sm text-stone">Map unavailable</div>}>
            {viewMode === "discover" ? (
              <DiscoverMap
                locations={discover.locations}
                userPosition={discover.userPosition}
                onLocationClick={discover.setExpandedLocation}
                highlightedLocationId={discover.highlightedLocationId}
                isLoading={discover.isLoading}
                initialCenter={discover.mapInitialCenter}
              />
            ) : (
              <ItineraryMapPanel
                day={safeSelectedDay}
                activities={currentDay?.activities ?? []}
                selectedActivityId={selectedActivityId}
                onSelectActivity={handleSelectActivity}
                isPlanning={isPlanning}
                startPoint={effectiveMapStartPoint}
                endPoint={effectiveMapEndPoint}
                tripStartDate={tripStartDate}
                dayLabel={currentDay?.dateLabel}
              />
            )}
          </ErrorBoundary>

          {/* Tap-to-expand overlay (when collapsed) */}
          {!mapExpanded && viewMode !== "discover" && (
            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="absolute inset-0 z-10"
              aria-label="Expand map"
            >
              {/* Bottom gradient hint */}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center scrim-60 pb-2.5 pt-8">
                <span className="rounded-full bg-charcoal/80 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  Tap to expand map
                </span>
              </div>
            </button>
          )}

          {/* Collapse button (when expanded) */}
          <AnimatePresence>
            {mapExpanded && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: durationFast, ease: easeReveal }}
                onClick={() => setMapExpanded(false)}
                className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-charcoal/80 text-white/90 backdrop-blur-sm transition-colors hover:bg-charcoal"
                aria-label="Collapse map"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-4 lg:p-4">
        {/* Left: Cards Panel (50%) */}
        <div className="flex flex-col lg:w-1/2 lg:sticky lg:top-[80px] lg:h-[calc(100dvh-96px)]">
          {/* Header bar */}
          <div
            className="sticky top-0 z-30 lg:relative border-b border-border bg-background px-4 pb-3 lg:px-6"
            style={{
              paddingTop: headerCollapsed ? "0.5rem" : "1rem",
              transition: "padding-top 0.25s ease",
            }}
          >
            {/* Collapsible: Trip name + stats (hidden on scroll down) */}
            <div
              style={{
                maxHeight: headerCollapsed ? 0 : 200,
                opacity: headerCollapsed ? 0 : 1,
                overflow: "hidden",
                transition: "max-height 0.25s ease, opacity 0.2s ease",
              }}
            >
              {/* Row 1: Trip name + view mode tabs + share */}
              <div className="flex items-start justify-between gap-3">
                <h1
                  ref={finalHeadingRef}
                  tabIndex={-1}
                  className={cn(typography({ intent: "editorial-h3" }), "min-w-0 text-lg md:text-lg tracking-[-0.02em] leading-snug focus:outline-none sm:text-xl")}
                >
                  {tripName}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  {!isReadOnly && (
                    <div className="flex h-[42px] shrink-0 items-center rounded-lg border border-border bg-surface p-0.5">
                      {(
                        [
                          { key: "timeline", label: "Timeline" },
                          { key: "dashboard", label: "Overview" },
                          ...(!isReadOnly ? [{ key: "discover", label: "Near Me" }] : []),
                        ] as { key: ItineraryViewMode; label: string }[]
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setViewMode(tab.key)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            viewMode === tab.key
                              ? "bg-brand-primary text-white"
                              : "text-stone hover:text-foreground"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {!isReadOnly && tripId && !isUsingMock && (
                    <ShareButton tripId={tripId} />
                  )}
                </div>
              </div>

              {/* Row 2: Stats line */}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-stone">
              {days.length > 0 && <span>{days.length} {days.length === 1 ? "day" : "days"}</span>}
              {totalActivities > 0 && <span aria-hidden="true">&middot;</span>}
              {totalActivities > 0 && <span>{totalActivities} {totalActivities === 1 ? "stop" : "stops"}</span>}
              {updatedLabel && <span aria-hidden="true">&middot;</span>}
              {updatedLabel && <span>Upd {updatedLabel}</span>}
              {!updatedLabel && createdLabel && <span aria-hidden="true">&middot;</span>}
              {!updatedLabel && createdLabel && <span>Saved {createdLabel}</span>}
              {isUsingMock && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                  Mock
                </span>
              )}
            </div>
            </div>

            {/* Always visible: Day selector + search + adjust (single row) */}
            <div style={{ marginTop: headerCollapsed ? 0 : "0.5rem", transition: "margin-top 0.25s ease" }} className="flex items-start gap-2">
              <DaySelector
                totalDays={days.length}
                selected={safeSelectedDay}
                onChange={handleSelectDayChange}
                labels={days.map((day) => {
                  const label = day.dateLabel ?? "";
                  // Ensure city is present in label for DaySelector display
                  if (label && !label.includes("(") && day.cityId) {
                    const city = day.cityId.charAt(0).toUpperCase() + day.cityId.slice(1);
                    return `${label} (${city})`;
                  }
                  return label;
                })}
                tripStartDate={tripStartDate}
                dayHealthLevels={dayHealthLevels}
              />
              {!isReadOnly && !isUsingMock && currentDay && viewMode === "timeline" && (
                <>
                  <div className="min-w-0 flex-1">
                    <LocationSearchBar
                      dayActivities={currentDay.activities}
                      onAddActivity={handleAddSearchedActivity}
                    />
                  </div>
                  {tripId && (
                    <DayRefinementButtons
                      dayIndex={safeSelectedDay}
                      tripId={tripId}
                      builderData={tripBuilderData}
                      itinerary={model}
                      onRefine={handleRefineDay}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Trip Confidence Dashboard */}
          <AnimatePresence>
            {viewMode === "dashboard" && (
              <div className="px-4 pb-6">
                <TripConfidenceDashboard
                  itinerary={model}
                  conflicts={conflictsResult.conflicts}
                  tripStartDate={tripStartDate}
                  selectedDay={safeSelectedDay}
                  onClose={() => setViewMode("timeline")}
                  onSelectDay={(dayIndex) => {
                    handleSelectDayChange(dayIndex);
                    setViewMode("timeline");
                  }}
                  onDayExpand={(dayIndex) => {
                    if (dayIndex != null) handleSelectDayChange(dayIndex);
                  }}
                  budgetTotal={tripBuilderData?.budget?.total}
                  tripBuilderData={tripBuilderData}
                  dayTripSuggestions={dayTripSuggestions}
                  onAcceptDayTrip={handleAcceptDayTrip}
                  isAcceptingDayTrip={isAcceptingDayTrip}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Discover Panel */}
          {viewMode === "discover" && (
            <div className="flex-1 overflow-hidden lg:rounded-lg lg:border lg:border-border">
              <ItineraryDiscoverPanel
                locations={discover.locations}
                isLoading={discover.isLoading}
                category={discover.category}
                onCategoryChange={discover.setCategory}
                openNow={discover.openNow}
                onOpenNowChange={discover.setOpenNow}
                searchQuery={discover.searchQuery}
                onSearchQueryChange={discover.setSearchQuery}
                highlightedLocationId={discover.highlightedLocationId}
                onHighlightChange={discover.setHighlightedLocationId}
                onLocationClick={discover.setExpandedLocation}
                onAddToDay={handleAddDiscoverActivity}
                usedLocationIds={discover.usedLocationIds}
                dayLabel={discover.dayLabel}
                userPosition={discover.userPosition}
                onRequestGeolocation={discover.requestGeolocation}
                geoLoading={discover.geoLocation.isLoading}
              />
            </div>
          )}

          {/* Seasonal Banner */}
          {model.seasonalHighlight && (
            <SeasonalBanner highlight={model.seasonalHighlight} />
          )}

          {/* Day trip suggestions banner */}
          {dayTripSuggestions && dayTripSuggestions.length > 0 && (
            <DayTripBanner
              suggestions={dayTripSuggestions}
              tripId={tripId}
              onViewDashboard={() => setViewMode("dashboard")}
            />
          )}

          {/* Conflict summary banner */}
          <ConflictSummaryBanner
            conflicts={conflictsResult}
            onSelectDay={(dayIndex) => {
              handleSelectDayChange(dayIndex);
              setViewMode("timeline");
            }}
          />

          {/* Activities List */}
          <div data-itinerary-activities data-lenis-prevent className={`relative flex-1 overflow-y-auto overscroll-contain border-border bg-background p-3 pb-[env(safe-area-inset-bottom)] lg:rounded-lg lg:border ${viewMode !== "timeline" ? "hidden" : ""}`}>
            {/* Day transition interstitial */}
            <AnimatePresence>
              {dayTransitionLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: durationFast, ease: easeReveal }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                  <h2 className={cn(typography({ intent: "editorial-h2" }), "text-3xl sm:text-4xl")}>
                    {dayTransitionLabel}
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* What's Next Card */}
            {currentDay && tripStartDate && (
              <WhatsNextCard
                day={currentDay}
                tripStartDate={tripStartDate}
                dayIndex={safeSelectedDay}
                onActivityClick={handleSelectActivity}
                className="mb-3"
              />
            )}

            {/* Timeline */}
            {currentDay ? (
              <ErrorBoundary>
                <ItineraryTimeline
                  day={currentDay}
                  dayIndex={safeSelectedDay}
                  model={model}
                  setModel={applyModelUpdate}
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={handleSelectActivity}
                  tripStartDate={tripStartDate}
                  tripId={tripId && !isUsingMock ? tripId : undefined}
                  onReorder={isReadOnly ? undefined : handleReorder}
                  onReplace={!isReadOnly && tripId && !isUsingMock ? handleReplace : undefined}
                  tripBuilderData={tripBuilderData}
                  suggestions={isReadOnly ? undefined : currentDaySuggestions}
                  onAcceptSuggestion={isReadOnly ? undefined : handleAcceptSuggestion}
                  onSkipSuggestion={isReadOnly ? undefined : onSkipSuggestion}
                  loadingSuggestionId={isReadOnly ? undefined : loadingSuggestionId}
                  conflicts={currentDayConflicts}
                  conflictsResult={conflictsResult}
                  guide={currentDayGuide}
                  onBeforeDragReorder={isReadOnly ? undefined : () => { skipAutoOptimizeRef.current = true; }}
                  onAfterDragReorder={isReadOnly ? undefined : (reordered) => { scheduleUserPlanningRef.current?.(reordered); }}
                  previewState={isReadOnly ? undefined : previewState}
                  onConfirmPreview={isReadOnly ? undefined : onConfirmPreview}
                  onShowAnother={isReadOnly ? undefined : onShowAnother}
                  onCancelPreview={isReadOnly ? undefined : onCancelPreview}
                  onFilterChange={isReadOnly ? undefined : onFilterChange}
                  isPreviewLoading={isReadOnly ? undefined : isPreviewLoading}
                  isReadOnly={isReadOnly}
                  startLocation={resolvedStartLocation}
                  endLocation={resolvedEndLocation}
                  onStartLocationChange={isReadOnly ? undefined : handleStartLocationChange}
                  onEndLocationChange={isReadOnly ? undefined : handleEndLocationChange}
                  onCityAccommodationChange={isReadOnly ? undefined : handleCityAccommodationChange}
                  onViewDetails={handleViewDetails}
                />
              </ErrorBoundary>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <svg className="h-8 w-8 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-stone">
                  This day couldn&apos;t be loaded. Try selecting another day.
                </p>
              </div>
            )}

            {/* Planning status */}
            {isPlanning && (
              <div className="mt-3 rounded-lg border border-dashed border-sage/30 bg-sage/10 p-2.5 text-xs text-sage">
                Updating travel times...
              </div>
            )}

            {/* Planning error */}
            {planningError && (
              <div className="mt-3 rounded-lg border border-error/30 bg-error/10 p-2.5 text-xs text-error">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-0.5 text-error/80">{planningError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPlanningError(null);
                    scheduleUserPlanning(model);
                  }}
                  className="mt-2 w-full rounded-lg bg-error px-3 py-1.5 text-xs font-medium text-white transition hover:bg-error/90"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky Map — desktop only (50%) */}
        <div className="hidden lg:sticky lg:top-[80px] lg:block lg:h-[calc(100dvh-96px)] lg:w-1/2">
          <div className="h-full lg:rounded-lg lg:overflow-hidden lg:border lg:border-border">
            <ErrorBoundary fallback={<div className="flex h-full items-center justify-center text-sm text-stone">Map unavailable</div>}>
              {viewMode === "discover" ? (
                <DiscoverMap
                  locations={discover.locations}
                  userPosition={discover.userPosition}
                  onLocationClick={discover.setExpandedLocation}
                  highlightedLocationId={discover.highlightedLocationId}
                  isLoading={discover.isLoading}
                  initialCenter={discover.mapInitialCenter}
                />
              ) : (
                <ItineraryMapPanel
                  day={safeSelectedDay}
                  activities={currentDay?.activities ?? []}
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={handleSelectActivity}
                  isPlanning={isPlanning}
                  startPoint={effectiveMapStartPoint}
                  endPoint={effectiveMapEndPoint}
                  tripStartDate={tripStartDate}
                  dayLabel={currentDay?.dateLabel}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Location Detail Panel */}
      <AnimatePresence>
        {(expandedLocation || discover.expandedLocation) && (
          <LocationExpanded
            location={(expandedLocation ?? discover.expandedLocation)!}
            onClose={() => {
              handleCloseExpanded();
              discover.setExpandedLocation(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Replacement Picker Modal */}
      {!isReadOnly && replacementActivityId && (() => {
        const originalActivity = model.days[selectedDay]?.activities.find(
          (a) => a.id === replacementActivityId && a.kind === "place",
        ) as Extract<ItineraryActivity, { kind: "place" }> | undefined;

        if (!originalActivity) return null;

        return (
          <ActivityReplacementPicker
            isOpen={true}
            onClose={() => {
              setReplacementActivityId(null);
              setReplacementCandidates([]);
            }}
            candidates={replacementCandidates}
            originalActivity={originalActivity}
            onSelect={handleReplaceSelect}
            isLoading={isLoadingReplacements}
          />
        );
      })()}
    </section>
    <PrintFooter />
    </ActivityRatingsProvider>
  );
};

// Dismissible conflict summary banner shown at itinerary open
function ConflictSummaryBanner({
  conflicts,
  onSelectDay,
}: {
  conflicts: ReturnType<typeof detectItineraryConflicts>;
  onSelectDay: (dayIndex: number) => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  const total = conflicts.summary.total;
  if (total === 0 || dismissed) return null;

  // Group conflict count per day
  const dayEntries: { dayIndex: number; count: number }[] = [];
  const seen = new Set<number>();
  for (const c of conflicts.conflicts) {
    if (!seen.has(c.dayIndex)) {
      seen.add(c.dayIndex);
      dayEntries.push({
        dayIndex: c.dayIndex,
        count: conflicts.conflicts.filter((x) => x.dayIndex === c.dayIndex).length,
      });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-4 mt-3 overflow-hidden rounded-lg border border-warning/20 bg-warning/5 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">
              {total} scheduling {total === 1 ? "note" : "notes"} for your trip
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {dayEntries.map(({ dayIndex, count }) => (
                <button
                  key={dayIndex}
                  type="button"
                  onClick={() => onSelectDay(dayIndex)}
                  className="rounded-lg bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning transition hover:bg-warning/20"
                >
                  Day {dayIndex + 1} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1 text-stone transition hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
