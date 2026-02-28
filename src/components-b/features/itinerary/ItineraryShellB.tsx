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
import { ActivityReplacementPickerB } from "./ActivityReplacementPickerB";
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
import { useItineraryPlanning } from "@/components/features/itinerary/hooks/useItineraryPlanning";
import { useItineraryScrollSync } from "@/components/features/itinerary/hooks/useItineraryScrollSync";
import { useItineraryGuide } from "@/components/features/itinerary/hooks/useItineraryGuide";
import { ShareButtonB } from "./ShareButtonB";
import { DaySelectorB } from "./DaySelectorB";
import { ItineraryTimelineB } from "./ItineraryTimelineB";
import { TripConfidenceDashboardB } from "./TripConfidenceDashboardB";
import { SmartPromptsDrawerB } from "./SmartPromptsDrawerB";
import { SeasonalBannerB } from "./SeasonalBannerB";
import { useActivityRatings } from "@/hooks/useActivityRatings";
import { ActivityRatingsProvider } from "@/components/features/itinerary/ActivityRatingsContext";

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
  const [showDashboard, setShowDashboard] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const lastScrollTopRef = useRef(0);
  const headerCooldownRef = useRef(false);
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

  // ── Header collapse on scroll (scroll down → collapse, scroll up → expand) ──
  useEffect(() => {
    const el = document.querySelector("[data-itinerary-activities]");
    if (!el) return;

    const THRESHOLD = 30; // px hysteresis
    const COOLDOWN_MS = 300; // prevent collapse/expand feedback loop at scroll bottom
    const handleScroll = () => {
      if (headerCooldownRef.current) return;

      const top = el.scrollTop;
      const delta = top - lastScrollTopRef.current;

      // At the very top, always expand
      if (top < 10) {
        setHeaderCollapsed(false);
        lastScrollTopRef.current = top;
        return;
      }

      // Near the bottom — don't toggle to avoid resize-scroll loop
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
    return undefined;
  }, [tripId, currentDay, dayEntryPoints]);

  const resolvedEndLocation = useMemo(() => {
    if (!tripId || !currentDay) return undefined;
    const dayEP = dayEntryPoints[`${tripId}-${currentDay.id}`];
    if (dayEP?.endPoint?.type === "accommodation") return dayEP.endPoint;
    return undefined;
  }, [tripId, currentDay, dayEntryPoints]);

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

  // ── Suggestions for current day ──
  const currentDaySuggestions = useMemo(() => {
    if (!suggestions || !currentDay) return [];
    return suggestions.filter((gap) => gap.dayIndex === safeSelectedDay);
  }, [suggestions, currentDay, safeSelectedDay]);

  // ── Conflict detection ──
  const conflictsResult = useMemo(() => {
    return detectItineraryConflicts(model);
  }, [model]);


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
  const rawTripName = currentTrip?.name ?? "Your Itinerary";
  // Strip date range from title (e.g. "Kyoto & Osaka Trip · Mar 14 – Mar 18" → "Kyoto & Osaka Trip")
  const tripNameParts = rawTripName.split(" · ");
  const tripName = tripNameParts[0];
  const tripDateRange = tripNameParts.length > 1 ? tripNameParts.slice(1).join(" · ") : null;
  const totalDays = days.length;
  const totalActivities = days.reduce(
    (sum, d) => sum + d.activities.filter((a) => a.kind === "place").length,
    0,
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

  return (
    <ActivityRatingsProvider value={!isReadOnly ? ratingsContextValue : null}>
    <section
      className="mx-auto min-h-[100dvh] max-w-screen-2xl lg:fixed lg:inset-x-0 lg:top-[var(--header-h)] lg:bottom-0 lg:min-h-0 lg:overflow-hidden"
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
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-charcoal/40 to-transparent pb-2.5 pt-8">
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-[var(--shadow-sm)]">
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
                className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-sm)] transition-colors hover:bg-white"
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
      <div className="flex flex-col lg:h-full lg:flex-row lg:gap-0">
        {/* Left: Cards Panel (50%) — header bar stays, activities scroll */}
        <div className="flex flex-col lg:w-1/2">
          {/* ── Header bar ── */}
          <div
            className="border-b px-5 pb-4 lg:px-6"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
              paddingTop: headerCollapsed ? "0.5rem" : "1.25rem",
              transition: "padding-top 0.25s ease",
            }}
          >
            {/* Collapsible title section */}
            <div
              style={{
                maxHeight: headerCollapsed ? 0 : 200,
                opacity: headerCollapsed ? 0 : 1,
                overflow: "hidden",
                transition: "max-height 0.25s ease, opacity 0.2s ease",
              }}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1
                    ref={finalHeadingRef}
                    tabIndex={-1}
                    className="text-lg font-bold leading-snug tracking-[-0.04em] focus:outline-none sm:text-xl"
                    style={{ color: "var(--foreground)" }}
                  >
                    {tripName}
                  </h1>
                  <div
                    className="mt-1 flex flex-wrap items-center gap-2 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {tripDateRange && (
                      <>
                        <span>{tripDateRange}</span>
                        {totalDays > 0 && <span aria-hidden="true">·</span>}
                      </>
                    )}
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
                          background: "color-mix(in srgb, var(--warning) 10%, transparent)",
                          color: "var(--warning)",
                        }}
                      >
                        Mock
                      </span>
                    )}
                    {createdLabel && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {updatedLabel ? `Upd ${updatedLabel}` : `Saved ${createdLabel}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-2">
                  {!isReadOnly && tripId && !isUsingMock && (
                    <button
                      type="button"
                      onClick={() => setShowDashboard((prev) => !prev)}
                      className="flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors active:scale-[0.98] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                      style={{
                        borderColor: showDashboard ? "var(--primary)" : "var(--border)",
                        backgroundColor: showDashboard
                          ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                          : "transparent",
                        color: showDashboard ? "var(--primary)" : "var(--muted-foreground)",
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="hidden sm:inline">{showDashboard ? "Day View" : "Overview"}</span>
                    </button>
                  )}
                  {!isReadOnly && tripId && !isUsingMock && (
                    <ShareButtonB tripId={tripId} />
                  )}
                </div>
              </div>
            </div>

            {/* Day selector — always visible */}
            <div style={{ marginTop: headerCollapsed ? 0 : "1rem", transition: "margin-top 0.25s ease" }}>
              <DaySelectorB
                totalDays={days.length}
                selected={safeSelectedDay}
                onChange={handleSelectDayChange}
                labels={days.map((day) => day.dateLabel ?? "")}
                tripStartDate={tripStartDate}
              />
            </div>
          </div>

          {/* Seasonal Banner */}
          {model.seasonalHighlight && (
            <SeasonalBannerB highlight={model.seasonalHighlight} />
          )}

          {/* ── Trip Confidence Dashboard ── */}
          <AnimatePresence>
            {showDashboard && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: bDurationFast, ease: bEase }}
                className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-5"
                data-lenis-prevent
              >
                <TripConfidenceDashboardB
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Activities List ── */}
          <div
            data-itinerary-activities
            data-lenis-prevent
            className={`relative flex-1 overflow-y-auto overscroll-contain p-4 pb-[env(safe-area-inset-bottom)] lg:p-5 ${showDashboard ? "hidden" : ""}`}
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
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--background) 95%, transparent)" }}
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
                  endLocation={resolvedEndLocation ?? resolvedStartLocation}
                  onStartLocationChange={
                    isReadOnly ? undefined : handleStartLocationChange
                  }
                  onEndLocationChange={
                    isReadOnly ? undefined : handleEndLocationChange
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
                    background: "color-mix(in srgb, var(--primary) 6%, transparent)",
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
                    borderColor: "var(--error)",
                    background: "color-mix(in srgb, var(--error) 6%, transparent)",
                    color: "var(--error)",
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
                    className="mt-2 w-full rounded-xl px-3 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]"
                    style={{ background: "var(--error, #DC2626)" }}
                  >
                    Retry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Map — desktop only (50%) */}
        <div className="hidden lg:block lg:w-1/2">
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
            <ActivityReplacementPickerB
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

      {/* Smart Prompts Drawer — only in Overview tab (day tabs have inline suggestions) */}
      {!isReadOnly && showDashboard && suggestions && suggestions.length > 0 && !dismissedSuggestions && (
        <SmartPromptsDrawerB
          gaps={suggestions}
          onAccept={handleAcceptSuggestion}
          onSkip={onSkipSuggestion ?? (() => {})}
          onDismissAll={() => setDismissedSuggestions(true)}
          loadingGapId={loadingSuggestionId}
        />
      )}
    </section>
    </ActivityRatingsProvider>
  );
};
