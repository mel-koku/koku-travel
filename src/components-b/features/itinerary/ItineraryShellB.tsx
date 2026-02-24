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
import { useAppState } from "@/state/AppState";
import type { Itinerary, ItineraryActivity } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { EntryPoint, TripBuilderData } from "@/types/trip";
import { ItineraryMapPanel } from "@/components/features/itinerary/ItineraryMapPanel";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ActivityReplacementPicker } from "@/components/features/itinerary/ActivityReplacementPicker";
import {
  useReplacementCandidates,
  locationToActivity,
  type ReplacementCandidate,
} from "@/hooks/useReplacementCandidates";
import type { DetectedGap } from "@/lib/smartPrompts/gapDetection";
import {
  detectItineraryConflicts,
  getDayConflicts,
} from "@/lib/validation/itineraryConflicts";
import type {
  AcceptGapResult,
  PreviewState,
  RefinementFilters,
} from "@/hooks/useSmartPromptActions";
import {
  calculateTripHealth,
  getHealthLevel,
} from "@/lib/itinerary/tripHealth";
import { useItineraryPlanning } from "@/components/features/itinerary/hooks/useItineraryPlanning";
import { useItineraryScrollSync } from "@/components/features/itinerary/hooks/useItineraryScrollSync";
import { useItineraryGuide } from "@/components/features/itinerary/hooks/useItineraryGuide";
import { ShareButton } from "@/components/features/itinerary/ShareButton";
import { DaySelectorB } from "./DaySelectorB";
import { ItineraryTimelineB } from "./ItineraryTimelineB";

const LocationExpanded = dynamic(
  () =>
    import("@/components/features/places/LocationExpanded").then((m) => ({
      default: m.LocationExpanded,
    })),
  { ssr: false },
);

// B motion tokens
const bEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const bDurationFast = 0.2;
const bDurationMedium = 0.35;

type ItineraryShellBProps = {
  tripId: string;
  itinerary: Itinerary;
  onItineraryChange?: (next: Itinerary) => void;
  headingRef?: RefObject<HTMLHeadingElement>;
  createdLabel: string | null;
  updatedLabel: string | null;
  isUsingMock: boolean;
  isReadOnly?: boolean;
  tripStartDate?: string;
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

export const ItineraryShellB = ({
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
}: ItineraryShellBProps) => {
  const {
    reorderActivities,
    replaceActivity,
    getTripById,
    dayEntryPoints,
    cityAccommodations,
    setDayEntryPoint,
    setCityAccommodation,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAppState();

  // ── Planning hook ──
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
  const [replacementActivityId, setReplacementActivityId] = useState<
    string | null
  >(null);
  const [replacementCandidates, setReplacementCandidates] = useState<
    ReplacementCandidate[]
  >([]);
  const [expandedLocation, setExpandedLocation] = useState<Location | null>(
    null,
  );
  const internalHeadingRef = useRef<HTMLHeadingElement>(null);
  const finalHeadingRef = headingRef ?? internalHeadingRef;

  // Replacement candidates mutation
  const replacementMutation = useReplacementCandidates();
  const isLoadingReplacements = replacementMutation.isPending;

  const currentTrip = useMemo(() => {
    return tripId && !isUsingMock ? getTripById(tripId) : null;
  }, [tripId, isUsingMock, getTripById]);

  // ── Handlers ──

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

      const activity = currentDay.activities.find(
        (a) => a.id === replacementActivityId,
      );
      if (!activity || activity.kind !== "place") return;

      const newActivity = locationToActivity(candidate.location, activity);

      if (tripId && !isUsingMock) {
        replaceActivity(
          tripId,
          currentDay.id,
          replacementActivityId,
          newActivity,
        );
      }

      const nextDays = model.days.map((d) => {
        if (d.id !== currentDay.id) return d;
        return {
          ...d,
          activities: d.activities.map((a) =>
            a.id === replacementActivityId ? newActivity : a,
          ),
        };
      });
      const nextItinerary = { ...model, days: nextDays };

      setModelState(nextItinerary);

      setTimeout(() => {
        scheduleUserPlanningRef.current?.(nextItinerary);
      }, 0);

      setReplacementActivityId(null);
      setReplacementCandidates([]);
    },
    [
      tripId,
      isUsingMock,
      replacementActivityId,
      model,
      selectedDay,
      replaceActivity,
      setModelState,
      scheduleUserPlanningRef,
    ],
  );

  // Focus heading on mount
  useEffect(() => {
    if (finalHeadingRef.current) {
      finalHeadingRef.current.focus();
    }
  }, [finalHeadingRef]);

  // ── Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z) ──
  useEffect(() => {
    if (!tripId || isUsingMock || isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      const isCmd = e.metaKey || e.ctrlKey;
      if (!isCmd) return;

      if (e.key === "z" && !e.shiftKey) {
        if (canUndo(tripId)) {
          e.preventDefault();
          undo(tripId);
        }
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        if (canRedo(tripId)) {
          e.preventDefault();
          redo(tripId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tripId, isUsingMock, isReadOnly, undo, redo, canUndo, canRedo]);

  // ── Derived state ──

  const days = model.days ?? [];
  const safeSelectedDay =
    days.length === 0
      ? 0
      : Math.min(selectedDay, Math.max(days.length - 1, 0));
  const currentDay = days[safeSelectedDay];
  const currentDayEntryPoints =
    tripId && currentDay?.id
      ? dayEntryPoints[`${tripId}-${currentDay.id}`]
      : undefined;

  // Resolve start/end locations for the current day
  const resolvedStartLocation = useMemo(() => {
    if (!tripId || !currentDay) return undefined;
    const dayEP = dayEntryPoints[`${tripId}-${currentDay.id}`];
    if (dayEP?.startPoint?.type === "accommodation") return dayEP.startPoint;
    const effectiveCityId = currentDay.baseCityId ?? currentDay.cityId;
    if (effectiveCityId) {
      const cityAccom = cityAccommodations[`${tripId}-${effectiveCityId}`];
      if (cityAccom) return cityAccom.entryPoint;
    }
    return undefined;
  }, [tripId, currentDay, dayEntryPoints, cityAccommodations]);

  const resolvedEndLocation = useMemo(() => {
    if (!tripId || !currentDay) return undefined;
    const dayEP = dayEntryPoints[`${tripId}-${currentDay.id}`];
    if (dayEP?.endPoint?.type === "accommodation") return dayEP.endPoint;
    const effectiveCityId = currentDay.baseCityId ?? currentDay.cityId;
    if (effectiveCityId) {
      const cityAccom = cityAccommodations[`${tripId}-${effectiveCityId}`];
      if (cityAccom) return cityAccom.entryPoint;
    }
    return undefined;
  }, [tripId, currentDay, dayEntryPoints, cityAccommodations]);

  const effectiveMapStartPoint =
    currentDayEntryPoints?.startPoint ?? resolvedStartLocation;
  const effectiveMapEndPoint =
    currentDayEntryPoints?.endPoint ?? resolvedEndLocation ?? resolvedStartLocation;

  // ── Entry point handlers ──

  const handleStartLocationChange = useCallback(
    (location: EntryPoint | undefined) => {
      if (!tripId || !currentDay?.id) return;
      setDayEntryPoint(tripId, currentDay.id, "start", location);
    },
    [tripId, currentDay, setDayEntryPoint],
  );

  const handleEndLocationChange = useCallback(
    (location: EntryPoint | undefined) => {
      if (!tripId || !currentDay?.id) return;
      setDayEntryPoint(tripId, currentDay.id, "end", location);
    },
    [tripId, currentDay, setDayEntryPoint],
  );

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

  // ── Suggestions for current day ──
  const currentDaySuggestions = useMemo(() => {
    if (!suggestions || !currentDay) return [];
    return suggestions.filter((gap) => gap.dayIndex === safeSelectedDay);
  }, [suggestions, currentDay, safeSelectedDay]);

  // ── Conflict detection ──
  const conflictsResult = useMemo(() => {
    return detectItineraryConflicts(model);
  }, [model]);

  // Per-day health levels for DaySelector dots
  const dayHealthLevels = useMemo(() => {
    const health = calculateTripHealth(model, conflictsResult.conflicts);
    return health.days.map((d) => getHealthLevel(d.score));
  }, [model, conflictsResult]);

  // ── Guide ──
  const { currentDayGuide } = useItineraryGuide(
    model,
    tripBuilderData,
    dayIntros,
    currentDay?.id,
  );

  // Conflicts for the current day
  const currentDayConflicts = useMemo(() => {
    if (!currentDay) return [];
    return getDayConflicts(conflictsResult, currentDay.id);
  }, [conflictsResult, currentDay]);

  // ── Scroll sync ──
  const { selectedActivityId, setSelectedActivityId, handleSelectActivity } =
    useItineraryScrollSync(safeSelectedDay);

  // ── Day transition ──
  const [dayTransitionLabel, setDayTransitionLabel] = useState<string | null>(
    null,
  );

  const handleSelectDayChange = useCallback(
    (dayIndex: number) => {
      const targetDay = model.days[dayIndex];
      if (targetDay?.dateLabel) {
        const cityName = targetDay.dateLabel
          .replace(/Day \d+\s*(\(([^)]+)\))?/, "$2")
          .trim();
        if (cityName) {
          setDayTransitionLabel(cityName);
          setTimeout(() => setDayTransitionLabel(null), 500);
        }
      }
      setSelectedDay(dayIndex);
      setSelectedActivityId(null);
    },
    [model.days, setSelectedActivityId],
  );

  // ── Accept suggestion wrapper ──
  const handleAcceptSuggestion = useCallback(
    async (gap: DetectedGap) => {
      if (!onAcceptSuggestion) return;
      const result = await onAcceptSuggestion(gap);
      if (result.success) {
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

  // ── Trip metadata ──
  const tripName = currentTrip?.name ?? "Your Itinerary";
  const totalDays = days.length;
  const totalActivities = days.reduce(
    (sum, d) => sum + d.activities.filter((a) => a.kind === "place").length,
    0,
  );

  return (
    <section
      className="mx-auto min-h-[100dvh] max-w-screen-2xl"
      style={{ background: "var(--background)" }}
    >
      {/* ── Mobile peek map strip (< lg) ── */}
      <div className="relative lg:hidden">
        <motion.div
          animate={{ height: mapExpanded ? "100dvh" : "30vh" }}
          transition={{ duration: bDurationMedium, ease: bEase }}
          className={
            mapExpanded
              ? "relative overflow-hidden pt-[env(safe-area-inset-top)]"
              : "relative overflow-hidden"
          }
        >
          <ErrorBoundary
            fallback={
              <div
                className="flex h-full items-center justify-center text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Map unavailable
              </div>
            }
          >
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
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-black/40 to-transparent pb-2.5 pt-8">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-[var(--foreground)] backdrop-blur-sm shadow-sm">
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
                transition={{ duration: bDurationFast, ease: bEase }}
                onClick={() => setMapExpanded(false)}
                className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                style={{ color: "var(--foreground)" }}
                aria-label="Collapse map"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Desktop layout: 50-50 split ── */}
      <div className="flex flex-col lg:flex-row lg:gap-0">
        {/* Left: Cards Panel (50%) */}
        <div className="flex flex-col lg:w-1/2">
          {/* ── Header bar ── */}
          <div
            className="border-b px-5 pt-5 pb-4 lg:px-6"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            {/* Title row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1
                  ref={finalHeadingRef}
                  tabIndex={-1}
                  className="truncate text-xl font-bold tracking-[-0.04em] focus:outline-none sm:text-2xl"
                  style={{ color: "var(--foreground)" }}
                >
                  {tripName}
                </h1>
                <div
                  className="mt-1 flex items-center gap-2 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {totalDays > 0 && (
                    <span>
                      {totalDays} {totalDays === 1 ? "day" : "days"}
                    </span>
                  )}
                  {totalDays > 0 && totalActivities > 0 && (
                    <span aria-hidden="true">·</span>
                  )}
                  {totalActivities > 0 && (
                    <span>
                      {totalActivities}{" "}
                      {totalActivities === 1 ? "stop" : "stops"}
                    </span>
                  )}
                  {isUsingMock && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--warning-bg, rgba(217,119,6,0.1))",
                        color: "var(--warning, #D97706)",
                      }}
                    >
                      Mock
                    </span>
                  )}
                </div>
                {createdLabel && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Saved {createdLabel}
                    {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
                  </p>
                )}
              </div>

              {/* Share button */}
              {!isReadOnly && tripId && !isUsingMock && (
                <ShareButton tripId={tripId} />
              )}
            </div>

            {/* Day selector */}
            <div className="mt-4">
              <DaySelectorB
                totalDays={days.length}
                selected={safeSelectedDay}
                onChange={handleSelectDayChange}
                labels={days.map((day) => day.dateLabel ?? "")}
                tripStartDate={tripStartDate}
                dayHealthLevels={dayHealthLevels}
              />
            </div>
          </div>

          {/* ── Activities List ── */}
          <div
            data-itinerary-activities
            className="relative flex-1 overflow-y-auto overscroll-contain p-4 pb-[env(safe-area-inset-bottom)] lg:p-5"
            style={{ background: "var(--background)" }}
          >
            {/* Day transition interstitial */}
            <AnimatePresence>
              {dayTransitionLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: bDurationFast, ease: bEase }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm"
                  style={{ background: "rgba(247,249,251,0.85)" }}
                >
                  <h2
                    className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl"
                    style={{ color: "var(--foreground)" }}
                  >
                    {dayTransitionLabel}
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timeline */}
            {currentDay ? (
              <ErrorBoundary>
                <ItineraryTimelineB
                  day={currentDay}
                  dayIndex={safeSelectedDay}
                  model={model}
                  setModel={applyModelUpdate}
                  selectedActivityId={selectedActivityId}
                  onSelectActivity={handleSelectActivity}
                  tripStartDate={tripStartDate}
                  tripId={tripId && !isUsingMock ? tripId : undefined}
                  onReorder={isReadOnly ? undefined : handleReorder}
                  onReplace={
                    !isReadOnly && tripId && !isUsingMock
                      ? handleReplace
                      : undefined
                  }
                  tripBuilderData={tripBuilderData}
                  suggestions={isReadOnly ? undefined : currentDaySuggestions}
                  onAcceptSuggestion={
                    isReadOnly ? undefined : handleAcceptSuggestion
                  }
                  onSkipSuggestion={isReadOnly ? undefined : onSkipSuggestion}
                  loadingSuggestionId={
                    isReadOnly ? undefined : loadingSuggestionId
                  }
                  conflicts={currentDayConflicts}
                  conflictsResult={conflictsResult}
                  guide={currentDayGuide}
                  onBeforeDragReorder={
                    isReadOnly
                      ? undefined
                      : () => {
                          skipAutoOptimizeRef.current = true;
                        }
                  }
                  onAfterDragReorder={
                    isReadOnly
                      ? undefined
                      : (reordered) => {
                          scheduleUserPlanningRef.current?.(reordered);
                        }
                  }
                  previewState={isReadOnly ? undefined : previewState}
                  onConfirmPreview={isReadOnly ? undefined : onConfirmPreview}
                  onShowAnother={isReadOnly ? undefined : onShowAnother}
                  onCancelPreview={isReadOnly ? undefined : onCancelPreview}
                  onFilterChange={isReadOnly ? undefined : onFilterChange}
                  isPreviewLoading={isReadOnly ? undefined : isPreviewLoading}
                  isReadOnly={isReadOnly}
                  startLocation={resolvedStartLocation}
                  endLocation={resolvedEndLocation}
                  onStartLocationChange={
                    isReadOnly ? undefined : handleStartLocationChange
                  }
                  onEndLocationChange={
                    isReadOnly ? undefined : handleEndLocationChange
                  }
                  onCityAccommodationChange={
                    isReadOnly ? undefined : handleCityAccommodationChange
                  }
                  onViewDetails={handleViewDetails}
                />
              </ErrorBoundary>
            ) : (
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                This day couldn&apos;t be loaded. Try selecting another.
              </p>
            )}

            {/* Planning status */}
            <AnimatePresence>
              {isPlanning && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: bDurationFast, ease: bEase }}
                  className="mt-4 rounded-2xl border p-3 text-xs"
                  style={{
                    borderColor: "var(--primary)",
                    background: "rgba(45,75,142,0.06)",
                    color: "var(--primary)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="28"
                        strokeDashoffset="8"
                        strokeLinecap="round"
                      />
                    </svg>
                    Updating travel times...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Planning error */}
            <AnimatePresence>
              {planningError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: bDurationFast, ease: bEase }}
                  className="mt-4 rounded-2xl border p-3 text-xs"
                  style={{
                    borderColor: "var(--error, #DC2626)",
                    background: "rgba(220,38,38,0.06)",
                    color: "var(--error, #DC2626)",
                  }}
                >
                  <p className="font-medium">Something went wrong</p>
                  <p className="mt-0.5 opacity-80">{planningError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanningError(null);
                      scheduleUserPlanning(model);
                    }}
                    className="mt-2 w-full rounded-xl px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "var(--error, #DC2626)" }}
                  >
                    Retry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Sticky Map — desktop only (50%) */}
        <div className="hidden lg:sticky lg:top-[var(--header-h)] lg:block lg:h-[calc(100dvh-var(--header-h))] lg:w-1/2">
          <div className="h-full">
            <ErrorBoundary
              fallback={
                <div
                  className="flex h-full items-center justify-center text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Map unavailable
                </div>
              }
            >
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
      {!isReadOnly &&
        replacementActivityId &&
        (() => {
          const originalActivity = model.days[selectedDay]?.activities.find(
            (a) => a.id === replacementActivityId && a.kind === "place",
          ) as
            | Extract<ItineraryActivity, { kind: "place" }>
            | undefined;

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
