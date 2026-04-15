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
import type { GeneratedGuide, GeneratedBriefings } from "@/types/llmConstraints";
import type { CulturalBriefing } from "@/types/culturalBriefing";
import { DaySelector } from "./DaySelector";

import { LocationSearchBar } from "./LocationSearchBar";
import { DayRefinementButtons } from "./DayRefinementButtons";
import { ItineraryTimeline } from "./ItineraryTimeline";

import { ItineraryMapPanel } from "./ItineraryMapPanel";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BeforeYouLandTab } from "./before-you-land/BeforeYouLandTab";
import { ActivityReplacementPicker } from "./ActivityReplacementPicker";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import { detectItineraryConflicts, getDayConflicts } from "@/lib/validation/itineraryConflicts";
import type { AcceptGapResult, PreviewState, RefinementFilters } from "@/hooks/useSmartPromptActions";
import { TripConfidenceDashboard } from "./TripConfidenceDashboard";
import { calculateTripHealth, getHealthLevel } from "@/lib/itinerary/tripHealth";
import { useItineraryPlanning } from "./hooks/useItineraryPlanning";
import { useItineraryScrollSync } from "./hooks/useItineraryScrollSync";
import { useItineraryGuide } from "./hooks/useItineraryGuide";
import { ShareButton } from "./ShareButton";
import { DownloadBookButton } from "./DownloadBookButton";
import { SeasonalBanner } from "./SeasonalBanner";
import { DayTripBanner } from "./DayTripBanner";
import { useActivityRatings } from "@/hooks/useActivityRatings";
import { ActivityRatingsProvider } from "./ActivityRatingsContext";
import { PrintHeader } from "./PrintHeader";
import { PrintFooter } from "./PrintFooter";
import { REGIONS } from "@/data/regions";
import { useItineraryDiscover } from "./hooks/useItineraryDiscover";
import { ItineraryDiscoverPanel } from "./ItineraryDiscoverPanel";
import { useSmartSuggestions } from "@/hooks/useSmartSuggestions";
import { useReplacementState } from "@/hooks/useReplacementState";
import { useDayTripActions } from "@/hooks/useDayTripActions";
import { useHeaderCollapse } from "@/hooks/useHeaderCollapse";
import { UnlockCard } from "./UnlockCard";
import { ContextualUnlockPrompt } from "./ContextualUnlockPrompt";
import { isDayAccessible, getTripTier } from "@/lib/billing/access";

type UnlockPromptContext = "locked_day" | "refinement" | "day_trip" | "share" | "pdf";

const DiscoverMap = dynamic(
  () => import("@/components/features/discover/DiscoverMap").then((m) => ({ default: m.DiscoverMap })),
  { ssr: false },
);

type ItineraryViewMode = "timeline" | "dashboard" | "discover" | "culture";

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
  dailyBriefings?: GeneratedBriefings;
  culturalBriefing?: CulturalBriefing;
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
  onUnlockClick?: () => void;
  tripUnlocked?: boolean;
  isGuest?: boolean;
  launchPricing?: boolean;
  launchSlotsRemaining?: number;
};

export const ItineraryShell = ({
  itinerary,
  tripId,
  onItineraryChange,
  headingRef,
  createdLabel: _createdLabel,
  updatedLabel: _updatedLabel,
  isUsingMock,
  isReadOnly,
  tripStartDate,
  tripBuilderData,
  dayIntros,
  guideProse,
  dailyBriefings,
  culturalBriefing,
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
  onUnlockClick,
  tripUnlocked,
  isGuest,
  launchPricing,
  launchSlotsRemaining,
}: ItineraryShellProps) => {
  const { reorderActivities, replaceActivity, addActivity, updateDayActivities, getTripById, dayEntryPoints, cityAccommodations, setDayEntryPoint, setCityAccommodation, undo, redo, canUndo, canRedo } = useAppState();

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
  const [cultureTabSeen, setCultureTabSeen] = useState(() => {
    if (typeof window === "undefined") return true;
    // localStorage.getItem throws in iOS Safari Private mode.
    try {
      return localStorage.getItem("yuku-culture-tab-seen") === "true";
    } catch {
      return true;
    }
  });

  const internalHeadingRef = useRef<HTMLHeadingElement>(null);
  const finalHeadingRef = headingRef ?? internalHeadingRef;

  const headerCollapsed = useHeaderCollapse(viewMode);

  const currentTrip = useMemo(() => {
    return tripId && !isUsingMock ? getTripById(tripId) : null;
  }, [tripId, isUsingMock, getTripById]);

  const fullAccessEnabled = process.env.NEXT_PUBLIC_FREE_FULL_ACCESS === "true";
  const isTripLocked = !(tripUnlocked ?? false) && !fullAccessEnabled;
  const [unlockPromptCtx, setUnlockPromptCtx] = useState<UnlockPromptContext | null>(null);
  const requireUnlock = useCallback(
    (ctx: UnlockPromptContext): boolean => {
      if (!isTripLocked) return false;
      setUnlockPromptCtx(ctx);
      return true;
    },
    [isTripLocked],
  );

  const {
    replacementActivityId,
    setReplacementActivityId,
    replacementCandidates,
    setReplacementCandidates,
    expandedLocation,
    isLoadingReplacements,
    handleReplace,
    handleReplaceSelect,
    handleViewDetails,
    handleCloseExpanded,
  } = useReplacementState({
    tripId,
    isUsingMock,
    currentTrip,
    model,
    selectedDay,
    replaceActivity,
    setModelState,
    scheduleUserPlanningRef,
  });

  const handleReorder = useCallback(
    (dayId: string, activityIds: string[]) => {
      if (isReadOnly) return;
      if (tripId && !isUsingMock) {
        reorderActivities(tripId, dayId, activityIds);
      }
    },
    [tripId, isUsingMock, isReadOnly, reorderActivities],
  );

  useEffect(() => {
    if (finalHeadingRef.current) {
      finalHeadingRef.current.focus();
    }
  }, [finalHeadingRef]);

  // Mark culture tab as seen on first visit
  useEffect(() => {
    if (viewMode === "culture" && !cultureTabSeen) {
      setCultureTabSeen(true);
      try {
        localStorage.setItem("yuku-culture-tab-seen", "true");
      } catch {
        // iOS Safari Private mode / quota exceeded — state-only update is fine
      }
    }
  }, [viewMode, cultureTabSeen]);

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
      if (isReadOnly) return;
      if (!tripId || !currentDay?.id) return;
      setDayEntryPoint(tripId, currentDay.id, "start", location);
      // If end isn't explicitly set, it defaults to same as start (via resolution logic)
    },
    [tripId, currentDay, setDayEntryPoint, isReadOnly],
  );

  // Handler: set end location for this day
  const handleEndLocationChange = useCallback(
    (location: EntryPoint | undefined) => {
      if (isReadOnly) return;
      if (!tripId || !currentDay?.id) return;
      setDayEntryPoint(tripId, currentDay.id, "end", location);
    },
    [tripId, currentDay, setDayEntryPoint, isReadOnly],
  );

  // Handler: set accommodation for all days in this city
  const handleCityAccommodationChange = useCallback(
    (location: EntryPoint | undefined) => {
      if (isReadOnly) return;
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
    [tripId, currentDay, setCityAccommodation, isReadOnly],
  );

  // Handler: change day start time
  const handleDayStartTimeChange = useCallback(
    (startTime: string) => {
      if (isReadOnly) return;
      applyModelUpdate((current) => {
        const nextDays = current.days.map((entry, index) => {
          if (index !== safeSelectedDay) return entry;
          return {
            ...entry,
            bounds: {
              ...(entry.bounds ?? {}),
              startTime,
            },
          };
        });
        return { ...current, days: nextDays };
      });
    },
    [safeSelectedDay, applyModelUpdate, isReadOnly],
  );

  const { currentDaySuggestions, handleAcceptSuggestion } = useSmartSuggestions({
    suggestions,
    currentDay,
    safeSelectedDay,
    onAcceptSuggestion,
    setIsPlanning,
  });

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

  // ── Add activity from location search ──
  const handleAddSearchedActivity = useCallback(
    (newActivity: Extract<ItineraryActivity, { kind: "place" }>) => {
      if (isReadOnly) return;
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
    [tripId, isUsingMock, isReadOnly, currentDay, model, addActivity, setModelState, scheduleUserPlanningRef],
  );

  // ── Refine day (Adjust button) ──
  const handleRefineDay = useCallback(
    (refinedDay: ItineraryDay) => {
      if (isReadOnly) return;
      const nextItinerary = {
        ...model,
        days: model.days.map((d, i) => (i === safeSelectedDay ? refinedDay : d)),
      };
      setModelState(nextItinerary);
      setTimeout(() => {
        scheduleUserPlanningRef.current?.(nextItinerary);
      }, 0);
    },
    [model, safeSelectedDay, setModelState, scheduleUserPlanningRef, isReadOnly],
  );

  // ── Day trip accept handler ──
  const { isAcceptingDayTrip, handleAcceptDayTrip } = useDayTripActions({
    model,
    tripId,
    isUsingMock,
    onItineraryChange,
    tripBuilderData,
    tripStartDate,
    updateDayActivities,
    setModelState,
    scheduleUserPlanningRef,
  });

  // ── Discover mode ──
  const discover = useItineraryDiscover({
    model,
    currentDay,
    dayIndex: safeSelectedDay,
  });

  const handleAddDiscoverActivity = useCallback(
    (location: Location) => {
      if (isReadOnly) return;
      const newActivity = discover.buildActivity(location);
      handleAddSearchedActivity(newActivity);
    },
    [discover, handleAddSearchedActivity, isReadOnly],
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

  return (
    <ActivityRatingsProvider value={!isReadOnly ? ratingsContextValue : null}>
    <PrintHeader tripName={tripName} dateRange={printDateRange} cities={printCities} />
    <section className="mx-auto min-h-[calc(100dvh-var(--header-h))] max-w-screen-2xl md:h-[calc(100dvh-var(--header-h))] md:overflow-hidden">
      {/* ── Mobile peek map strip (< lg) ── */}
      <div className="relative md:hidden">
        <motion.div
          animate={{ height: viewMode === "discover" ? "50dvh" : mapExpanded ? "100dvh" : "30dvh" }}
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

      <div className="flex flex-col md:h-full md:flex-row md:gap-4 md:p-4">
        {/* Left: Cards Panel (60%) */}
        <div className="flex flex-col md:w-1/2 lg:w-3/5 md:min-h-0 md:overflow-y-auto" data-lenis-prevent>
          {/* Header bar */}
          <div
            className={`border-b border-border bg-background px-4 pb-2.5 md:px-6 ${viewMode === "timeline" ? "sticky top-0 z-30" : ""}`}
            style={{
              paddingTop: headerCollapsed ? "0.375rem" : "0.75rem",
              transition: "padding-top 0.25s ease",
            }}
          >
            {/* Collapsible: Trip name + tabs + share (single row) */}
            <div
              style={{
                maxHeight: headerCollapsed ? 0 : 200,
                opacity: headerCollapsed ? 0 : 1,
                overflow: "hidden",
                transition: "max-height 0.25s ease, opacity 0.2s ease",
              }}
            >
              {/* Unified toolbar: title | tabs + share */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <h1
                    ref={finalHeadingRef}
                    tabIndex={-1}
                    className="min-w-0 truncate font-serif text-base font-semibold tracking-heading leading-snug text-foreground focus:outline-none sm:text-lg"
                  >
                    {tripName}
                  </h1>
                  {isUsingMock && (
                    <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                      Mock
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1 overflow-x-auto overscroll-contain sm:overflow-visible">
                  <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
                    {(
                      [
                        { key: "timeline", label: "Timeline" },
                        { key: "dashboard", label: "Overview" },
                        ...(!isReadOnly ? [{ key: "discover", label: "Near Me" }] : []),
                        ...(culturalBriefing ? [{ key: "culture" as const, label: "Before You Land" }] : []),
                      ] as { key: ItineraryViewMode; label: string }[]
                    ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setViewMode(tab.key)}
                          className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                            viewMode === tab.key
                              ? "bg-brand-primary text-white"
                              : "text-stone hover:text-foreground"
                          }`}
                        >
                          {tab.label}
                          {tab.key === "culture" && !cultureTabSeen && (
                            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-primary" />
                          )}
                      </button>
                    ))}
                  </div>
                  {!isReadOnly && tripId && !isUsingMock && (
                    <>
                      <DownloadBookButton
                        tripId={tripId}
                        locked={isTripLocked}
                        onLockedClick={() => requireUnlock("pdf")}
                      />
                      <ShareButton
                        tripId={tripId}
                        locked={isTripLocked}
                        onLockedClick={() => requireUnlock("share")}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Day selector + search + adjust — timeline only */}
            {viewMode === "timeline" && (
              <div style={{ marginTop: headerCollapsed ? 0 : "0.5rem", transition: "margin-top 0.25s ease" }} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DaySelector
                  totalDays={days.length}
                  selected={safeSelectedDay}
                  onChange={handleSelectDayChange}
                  cityIds={days.map((day) => day.cityId)}
                  tripStartDate={tripStartDate}
                  dayHealthLevels={dayHealthLevels}
                  lockedDayIndices={isTripLocked
                    ? new Set(days.map((_, i) => i).filter((i) => i > 0))
                    : undefined}
                  onLockedClick={() => requireUnlock("locked_day")}
                />
                {!isReadOnly && !isUsingMock && currentDay && (
                  <div className="flex items-center gap-2">
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
                        currentStartTime={currentDay.bounds?.startTime ?? "09:00"}
                        onStartTimeChange={handleDayStartTimeChange}
                        onRequireUnlock={() => requireUnlock("refinement")}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trip Confidence Dashboard */}
          <AnimatePresence>
            {viewMode === "dashboard" && (
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-6 md:flex-none md:overflow-visible" data-lenis-prevent>
                <TripConfidenceDashboard
                  itinerary={model}
                  conflicts={conflictsResult.conflicts}
                  conflictsResult={conflictsResult}
                  tripStartDate={tripStartDate}
                  onClose={() => setViewMode("timeline")}
                  onSelectDay={(dayIndex) => {
                    handleSelectDayChange(dayIndex);
                    setViewMode("timeline");
                  }}
                  tripBuilderData={tripBuilderData}
                  dayTripSuggestions={dayTripSuggestions}
                  onAcceptDayTrip={(suggestion, dayIndex) => {
                    if (requireUnlock("day_trip")) return;
                    handleAcceptDayTrip(suggestion, dayIndex);
                  }}
                  isAcceptingDayTrip={isAcceptingDayTrip}
                  suggestions={suggestions}
                  dailyBriefings={dailyBriefings}
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
                geoError={discover.geoLocation.error}
              />
            </div>
          )}

          {/* Before You Land (Culture) Tab */}
          {viewMode === "culture" && culturalBriefing && (
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-6 md:flex-none md:overflow-visible" data-lenis-prevent>
              <BeforeYouLandTab briefing={culturalBriefing} />
            </div>
          )}

          {/* Activities List */}
          <div data-itinerary-activities className={`relative flex-1 overflow-y-auto overscroll-contain bg-background px-3 pt-3 pb-[env(safe-area-inset-bottom)] md:flex-none md:overflow-visible ${viewMode !== "timeline" ? "hidden" : ""}`}>
            {/* Compact notification strips */}
            {(model.seasonalHighlight || (dayTripSuggestions && dayTripSuggestions.length > 0)) && (
              <div className="mb-3 space-y-1">
                {model.seasonalHighlight && (
                  <SeasonalBanner highlight={model.seasonalHighlight} />
                )}
                {dayTripSuggestions && dayTripSuggestions.length > 0 && (
                  <DayTripBanner
                    suggestions={dayTripSuggestions}
                    tripId={tripId}
                    onViewDashboard={() => setViewMode("dashboard")}
                  />
                )}
              </div>
            )}

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

            {/* Timeline */}
            {currentDay ? (
              <>
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
                  isLocked={!isDayAccessible(safeSelectedDay, tripUnlocked ?? false, fullAccessEnabled)}
                  onUnlockClick={onUnlockClick}
                />
              </ErrorBoundary>

              {/* Unlock Card (shown after Day 1 when trip is not unlocked) */}
              {safeSelectedDay === 0 && !(tripUnlocked ?? false) && !fullAccessEnabled && model.days.length > 1 && (
                <UnlockCard
                  tier={getTripTier(model.days.length)}
                  cities={[...new Set(model.days.slice(1).map((d) => d.cityId).filter(Boolean))] as string[]}
                  totalDays={model.days.length}
                  isGuest={isGuest}
                  launchPricing={launchPricing}
                  launchSlotsRemaining={launchSlotsRemaining}
                  onUnlock={onUnlockClick ?? (() => {})}
                />
              )}
              </>
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

        {/* Right: Sticky Map — desktop only (40%) */}
        <div className="hidden md:block md:w-1/2 lg:w-2/5">
          <div className="h-full md:rounded-lg md:overflow-hidden md:border md:border-border">
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
    <ContextualUnlockPrompt
      isOpen={unlockPromptCtx !== null}
      context={unlockPromptCtx ?? "locked_day"}
      tier={getTripTier(model.days.length)}
      onUnlock={() => {
        setUnlockPromptCtx(null);
        onUnlockClick?.();
      }}
      onClose={() => setUnlockPromptCtx(null)}
    />
    </ActivityRatingsProvider>
  );
};

