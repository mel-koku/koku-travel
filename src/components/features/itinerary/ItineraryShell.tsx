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
import { useAppState } from "@/state/AppState";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { EntryPoint, TripBuilderData } from "@/types/trip";
import { DaySelector } from "./DaySelector";
import { ItineraryTimeline } from "./ItineraryTimeline";
import { WhatsNextCard } from "./WhatsNextCard";
import { ItineraryMapPanel } from "./ItineraryMapPanel";
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
}: ItineraryShellProps) => {
  const { reorderActivities, replaceActivity, getTripById, dayEntryPoints, cityAccommodations, setDayEntryPoint, setCityAccommodation, undo, redo, canUndo, canRedo } = useAppState();

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
  const [showDashboard, setShowDashboard] = useState(false);
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

  // Compute per-day health levels for DaySelector dots
  const dayHealthLevels = useMemo(() => {
    const health = calculateTripHealth(model, conflictsResult.conflicts);
    return health.days.map((d) => getHealthLevel(d.score));
  }, [model, conflictsResult]);

  // Guide hook — lazy-loads ~90KB of template data
  const { currentDayGuide } = useItineraryGuide(model, tripBuilderData, dayIntros, currentDay?.id);

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

  return (
    <section className="mx-auto min-h-[calc(100dvh-80px)] max-w-screen-2xl">
      {/* ── Mobile peek map strip (< lg) ── */}
      <div className="relative lg:hidden">
        <motion.div
          animate={{ height: mapExpanded ? "100dvh" : "30vh" }}
          transition={{
            duration: durationSlow,
            ease: easePageTransitionMut,
          }}
          className={mapExpanded ? "relative overflow-hidden pt-[env(safe-area-inset-top)]" : "relative overflow-hidden"}
        >
          <ErrorBoundary fallback={<div className="flex h-full items-center justify-center text-sm text-stone">Map unavailable</div>}>
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
          </ErrorBoundary>

          {/* Tap-to-expand overlay (when collapsed) */}
          {!mapExpanded && (
            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="absolute inset-0 z-10"
              aria-label="Expand map"
            >
              {/* Bottom gradient hint */}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-charcoal/60 to-transparent pb-2.5 pt-8">
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
                className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-charcoal/80 text-white/90 backdrop-blur-sm transition-colors hover:bg-charcoal"
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
        <div className="flex flex-col lg:w-1/2">
          {/* Header + Day Selector */}
          <div className="px-4 pt-4 pb-3 lg:px-4 space-y-2">
            {/* Row 1: Title + Date */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1
                ref={finalHeadingRef}
                tabIndex={-1}
                className="font-serif italic text-2xl text-foreground tracking-[-0.02em] focus:outline-none sm:text-3xl"
              >
                Your Itinerary
              </h1>
              {isUsingMock && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                  Mock
                </span>
              )}
              {createdLabel && (
                <p className="font-mono text-[11px] text-stone">
                  Saved {createdLabel}
                  {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
                </p>
              )}
            </div>
            {/* Row 2: Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <DaySelector
                  totalDays={days.length}
                  selected={safeSelectedDay}
                  onChange={handleSelectDayChange}
                  labels={days.map((day) => day.dateLabel ?? "")}
                  tripStartDate={tripStartDate}
                  variant="default"
                  dayHealthLevels={dayHealthLevels}
                />
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setShowDashboard((prev) => !prev)}
                    className={`flex h-[42px] items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition shrink-0 ${
                      showDashboard
                        ? "border-sage bg-sage/10 text-sage"
                        : "border-border text-stone hover:border-sage hover:text-foreground"
                    }`}
                    aria-label="Trip overview"
                    title="Trip overview"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="hidden sm:inline">{showDashboard ? "Day View" : "Overview"}</span>
                  </button>
                )}
                {!isReadOnly && tripId && !isUsingMock && (
                  <ShareButton tripId={tripId} />
                )}
              </div>
            </div>
            {!isReadOnly && !showDashboard && (
              <p className="text-xs text-foreground-secondary">
                * Check <button type="button" onClick={() => setShowDashboard(true)} className="underline hover:text-foreground transition-colors">Overview</button> for reservations and pre-trip to-dos.
              </p>
            )}
          </div>

          {/* Trip Confidence Dashboard */}
          <AnimatePresence>
            {showDashboard && (
              <div className="px-4 pb-6">
                <TripConfidenceDashboard
                  itinerary={model}
                  conflicts={conflictsResult.conflicts}
                  tripStartDate={tripStartDate}
                  selectedDay={safeSelectedDay}
                  onClose={() => setShowDashboard(false)}
                  onSelectDay={(dayIndex) => {
                    handleSelectDayChange(dayIndex);
                    setShowDashboard(false);
                  }}
                  onDayExpand={(dayIndex) => {
                    if (dayIndex != null) handleSelectDayChange(dayIndex);
                  }}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Activities List */}
          <div data-itinerary-activities className={`relative flex-1 overflow-y-auto overscroll-contain border-border bg-background p-3 pb-[env(safe-area-inset-bottom)] lg:rounded-xl lg:border ${showDashboard ? "hidden" : ""}`}>
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
                  <h2 className="font-serif italic text-3xl text-foreground sm:text-4xl">
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
              <p className="text-sm text-stone">
                This day couldn&apos;t be loaded. Try selecting another.
              </p>
            )}

            {/* Planning status */}
            {isPlanning && (
              <div className="mt-3 rounded-xl border border-dashed border-sage/30 bg-sage/10 p-2.5 text-xs text-sage">
                Updating travel times...
              </div>
            )}

            {/* Planning error */}
            {planningError && (
              <div className="mt-3 rounded-xl border border-error/30 bg-error/10 p-2.5 text-xs text-error">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-0.5 text-error/80">{planningError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setPlanningError(null);
                    scheduleUserPlanning(model);
                  }}
                  className="mt-2 w-full rounded-xl bg-error px-3 py-1.5 text-xs font-medium text-white transition hover:bg-error/90"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sticky Map — desktop only (50%) */}
        <div className="hidden lg:sticky lg:top-[80px] lg:block lg:h-[calc(100dvh-96px)] lg:w-1/2">
          <div className="h-full lg:rounded-xl lg:overflow-hidden lg:border lg:border-border">
            <ErrorBoundary fallback={<div className="flex h-full items-center justify-center text-sm text-stone">Map unavailable</div>}>
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
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Location Detail Panel */}
      <AnimatePresence>
        {expandedLocation && (
          <LocationExpanded
            location={expandedLocation}
            onClose={handleCloseExpanded}
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
  );
};


