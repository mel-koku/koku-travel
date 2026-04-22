"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ChapterHeader } from "./ChapterHeader";
import { Spine } from "./Spine";
import { Beat } from "./Beat";
import { BeatTransit } from "./BeatTransit";
import { InlineDayNote, type InlineDayNoteEntry } from "./InlineDayNote";
import { UnlockBeat } from "./UnlockBeat";
import { AccommodationPicker } from "../AccommodationPicker";
import type { BeatChip } from "./Beat";
import type { Location } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import { getGtag } from "@/lib/analytics/customLocations";
import { env } from "@/lib/env";
import { useFocusDay } from "@/lib/itinerary/useFocusDay";
import { easeEditorialMut, durationBase } from "@/lib/motion";

export type ChapterBeat = {
  id: string;
  time: string;
  partOfDay: "Morning" | "Midday" | "Afternoon" | "Evening" | "Night";
  location: Location;
  body: string;
  note?: string;
  chips: BeatChip[];
  hasMore: boolean;
  transitToNext: {
    minutes: number;
    mode: "walk" | "train" | "car" | "bus" | "transit";
    line?: string;
    steps?: Array<{
      type: "walk" | "transit";
      walkMinutes?: number;
      walkInstruction?: string;
      lineName?: string;
      lineShortName?: string;
      lineColor?: string;
      trainType?: string;
      departureStop?: string;
      arrivalStop?: string;
      headsign?: string;
      numStops?: number;
      durationMinutes?: number;
      departureGateway?: string;
      arrivalGateway?: string;
      fareYen?: number;
      carPosition?: string;
    }>;
    totalFareYen?: number;
    summary?: {
      departureStop?: string;
      arrivalStop?: string;
      lineName?: string;
      lineShortName?: string;
      lineColor?: string;
    };
    // For Google Maps escape hatch
    origin?: { lat: number; lng: number; name?: string };
    destination?: { lat: number; lng: number; name?: string };
    isEstimated?: boolean;
  } | null;
};

export type ChapterDay = {
  id: string;
  date: string;
  city: string;
  cityId?: string;
  intro: string;
  beats: ChapterBeat[];
  inlineNotes: InlineDayNoteEntry[];
  isLocked: boolean;
  dayActivities: ItineraryActivity[];
};

export type ChapterListProps = {
  trip: { id: string; name: string; days: ChapterDay[] };
  onExpandBeat: (beatId: string) => void;
  onReviewAdvisories: () => void;
  unlockProps?: {
    priceLabel: string;
    launchSlotsRemaining?: number;
    onUnlock: () => void;
    cities: string[];
    totalDays: number;
  };
  isReadOnly?: boolean;
  /** Active day index (0-based). When provided, only that day is rendered. */
  selectedDayIndex?: number;
  /** Called when prev/next arrows change the active day. */
  onDayChange?: (dayIndex: number) => void;
  /** @deprecated — scroll-based day tracking, unused when selectedDayIndex is set */
  onVisibleDayChange?: (dayIndex: number) => void;
  onReorderBeats?: (dayIndex: number, activityIds: string[]) => void;
  onReplaceBeat?: (dayIndex: number, beatId: string) => void;
  onNoteChange?: (dayIndex: number, beatId: string, note: string) => void;
  onRemoveBeat?: (dayIndex: number, beatId: string) => void;
  /** Resolved start/end entry points for the active day. */
  dayStartLocation?: import("@/types/trip").EntryPoint;
  dayEndLocation?: import("@/types/trip").EntryPoint;
  /** Callbacks to set start/end for the active day. */
  onDayStartChange?: (location: import("@/types/trip").EntryPoint | undefined) => void;
  onDayEndChange?: (location: import("@/types/trip").EntryPoint | undefined) => void;
  /** Apply the current start as the city-level accommodation (all days in city). */
  onSetCityAccommodation?: (location: import("@/types/trip").EntryPoint | undefined) => void;
};

function beatIsBeforeNow(time: string, dayDate: string, now: Date): boolean {
  const beatAt = new Date(`${dayDate}T${time}:00+09:00`);
  return now.getTime() >= beatAt.getTime();
}

function resolveCurrentBeatIdx(
  beats: ChapterBeat[],
  dayDate: string,
  now: Date,
): number {
  let currentIdx = -1;
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    if (beat && beatIsBeforeNow(beat.time, dayDate, now)) currentIdx = i;
    else break;
  }
  return currentIdx;
}

function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function ChapterList({
  trip,
  onExpandBeat,
  onReviewAdvisories,
  unlockProps,
  isReadOnly,
  selectedDayIndex,
  onDayChange,
  onReorderBeats,
  onReplaceBeat,
  onNoteChange,
  onRemoveBeat,
  dayStartLocation,
  dayEndLocation,
  onDayStartChange,
  onDayEndChange,
  onSetCityAccommodation,
}: ChapterListProps) {
  const day1LastBeatRef = useRef<HTMLDivElement | null>(null);
  const hasLoggedScrollDepth = useRef(false);

  const isPaged = selectedDayIndex !== undefined && onDayChange !== undefined;
  const activeIdx = isPaged ? Math.max(0, Math.min(selectedDayIndex, trip.days.length - 1)) : 0;
  const visibleDays = isPaged ? trip.days.slice(activeIdx, activeIdx + 1) : trip.days;

  const { index: focusDayIdx, isDayOfMode } = useFocusDay(trip.days);
  const dayOfEnabled = env.itineraryV2DayOf;
  const prefersReducedMotion = useReducedMotion();

  const currentBeatIndexByDay = useMemo(() => {
    const out = new Map<string, number>();
    if (!dayOfEnabled || !isDayOfMode) return out;
    const focusDay = trip.days[focusDayIdx];
    if (!focusDay) return out;
    const now = new Date();
    out.set(focusDay.id, resolveCurrentBeatIdx(focusDay.beats, focusDay.date, now));
    return out;
  }, [dayOfEnabled, isDayOfMode, focusDayIdx, trip.days]);

  useEffect(() => {
    const el = day1LastBeatRef.current;
    if (!el || hasLoggedScrollDepth.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasLoggedScrollDepth.current) {
            hasLoggedScrollDepth.current = true;
            getGtag()?.("event", "itinerary_v2.scroll_depth", {
              trip_id: trip.id,
              day_index: 0,
            });
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trip.id]);

  const handleMove = useCallback(
    (dayIdx: number, beatIdx: number, direction: -1 | 1, dayBeats: ChapterBeat[]) => {
      const newIdx = beatIdx + direction;
      if (newIdx < 0 || newIdx >= dayBeats.length) return;
      const reordered = [...dayBeats];
      const [moved] = reordered.splice(beatIdx, 1);
      if (!moved) return;
      reordered.splice(newIdx, 0, moved);
      onReorderBeats?.(dayIdx, reordered.map((b) => b.id));
    },
    [onReorderBeats],
  );

  return (
    <div>
      {visibleDays.map((day, visibleIdx) => {
        const idx = isPaged ? activeIdx : visibleIdx;
        return (
        <section
          key={day.id}
          id={`day-${idx + 1}`}
          data-day-index={idx}
          className="pt-8"
        >
          <div>
          <ChapterHeader
            dayIndex={idx}
            city={day.city}
            date={formatDateDisplay(day.date)}
            intro={day.intro}
          />
          <InlineDayNote notes={day.inlineNotes} onReview={onReviewAdvisories} />
          {!day.isLocked && (onDayStartChange || dayStartLocation || dayEndLocation) && (
            <div className="mt-8 mb-6">
              <div className="eyebrow-editorial mb-2">Routing from & to</div>
              <AccommodationPicker
                startLocation={dayStartLocation}
                endLocation={dayEndLocation}
                cityId={day.cityId}
                onStartChange={onDayStartChange ?? (() => {})}
                onEndChange={onDayEndChange ?? (() => {})}
                onSetCityAccommodation={onSetCityAccommodation}
                isReadOnly={!onDayStartChange}
              />
            </div>
          )}
          {day.isLocked ? (
            unlockProps && (
              <div className="mt-6">
                <UnlockBeat
                  cities={unlockProps.cities}
                  totalDays={unlockProps.totalDays}
                  priceLabel={unlockProps.priceLabel}
                  launchSlotsRemaining={unlockProps.launchSlotsRemaining}
                  onUnlock={unlockProps.onUnlock}
                />
              </div>
            )
          ) : (
            day.beats.length > 0 && (
              <Spine>
                <LayoutGroup id={`day-${day.id}-beats`}>
                {day.beats.map((beat, beatIdx) => {
                  const currentBeatIdx = currentBeatIndexByDay.get(day.id) ?? -1;
                  const isCurrent = idx === focusDayIdx && beatIdx === currentBeatIdx;
                  const isPast = idx === focusDayIdx && beatIdx < currentBeatIdx;

                  return (
                    <motion.div
                      key={beat.id}
                      layout={prefersReducedMotion ? false : "position"}
                      transition={{ duration: durationBase, ease: easeEditorialMut }}
                      ref={idx === 0 && beatIdx === day.beats.length - 1 ? (el) => { day1LastBeatRef.current = el; } : undefined}
                    >
                      <Beat
                        time={beat.time}
                        partOfDay={beat.partOfDay}
                        location={beat.location}
                        body={beat.body}
                        note={beat.note}
                        isPast={isPast}
                        isCurrent={isCurrent}
                        chips={beat.chips}
                        hasMore={beat.hasMore}
                        onExpand={() => onExpandBeat(beat.id)}
                        onMoveUp={isReadOnly ? undefined : () => handleMove(idx, beatIdx, -1, day.beats)}
                        onMoveDown={isReadOnly ? undefined : () => handleMove(idx, beatIdx, 1, day.beats)}
                        canMoveUp={beatIdx > 0}
                        canMoveDown={beatIdx < day.beats.length - 1}
                        onReplace={isReadOnly || !onReplaceBeat ? undefined : () => onReplaceBeat(idx, beat.id)}
                        onNoteChange={isReadOnly || !onNoteChange ? undefined : (value) => onNoteChange(idx, beat.id, value)}
                        onRemove={isReadOnly || !onRemoveBeat ? undefined : () => onRemoveBeat(idx, beat.id)}
                      />
                      {beat.transitToNext && beatIdx < day.beats.length - 1 && (
                        <BeatTransit {...beat.transitToNext} />
                      )}
                    </motion.div>
                  );
                })}
                </LayoutGroup>
              </Spine>
            )
          )}
          </div>
          {isPaged && (
            <div className="flex items-center justify-between px-6 py-8 mt-4">
              <button
                type="button"
                onClick={() => onDayChange(activeIdx - 1)}
                disabled={activeIdx === 0}
                aria-label="Previous day"
                className="flex items-center gap-2 text-sm text-foreground-secondary transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Prev
              </button>
              <span className="font-mono text-[11px] uppercase tracking-wide text-stone">
                Day {activeIdx + 1} / {trip.days.length}
              </span>
              <button
                type="button"
                onClick={() => onDayChange(activeIdx + 1)}
                disabled={activeIdx === trip.days.length - 1}
                aria-label="Next day"
                className="flex items-center gap-2 text-sm text-foreground-secondary transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                Next
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </section>
        );
      })}
    </div>
  );
}
