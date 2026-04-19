"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChapterHeader } from "./ChapterHeader";
import { Spine } from "./Spine";
import { Beat, type BeatChip } from "./Beat";
import { BeatTransit } from "./BeatTransit";
import { InlineDayNote, type InlineDayNoteEntry } from "./InlineDayNote";
import { UnlockBeat } from "./UnlockBeat";
import { InlineAddActivity } from "./InlineAddActivity";
import type { Location } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import { getGtag } from "@/lib/analytics/customLocations";
import { env } from "@/lib/env";
import { useFocusDay } from "@/lib/itinerary/useFocusDay";

export type ChapterBeat = {
  id: string;
  time: string;
  partOfDay: "Morning" | "Midday" | "Afternoon" | "Evening" | "Night";
  location: Location;
  body: string;
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
  } | null;
};

export type ChapterDay = {
  id: string;
  date: string;
  city: string;
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
  onAddActivity?: (
    dayIndex: number,
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    meta: { addressSource: "mapbox" | "google" | "as-is" | "none" },
  ) => void;
  isReadOnly?: boolean;
  onVisibleDayChange?: (dayIndex: number) => void;
};

function beatIsBeforeNow(time: string, dayDate: string, now: Date): boolean {
  // time is "HH:MM", dayDate is YYYY-MM-DD. Combine and compare to `now` as JST.
  const beatAt = new Date(`${dayDate}T${time}:00+09:00`);
  return now.getTime() >= beatAt.getTime();
}

function resolveCurrentBeatIdx(
  beats: ChapterBeat[],
  dayDate: string,
  now: Date,
): number {
  // "Current" = the largest beat index whose time is <= now. If all are after now,
  // there is no current beat (return -1).
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
  // ISO date strings match YYYY-MM-DD — if the string is not a valid date
  // (e.g. a day.dateLabel fallback like "Day 1 (Tokyo)"), pass through as-is.
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
  onAddActivity,
  isReadOnly,
  onVisibleDayChange,
}: ChapterListProps) {
  const day1LastBeatRef = useRef<HTMLDivElement | null>(null);
  const hasLoggedScrollDepth = useRef(false);
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
  const lastReportedIdx = useRef<number>(-1);

  const { index: focusDayIdx, isDayOfMode } = useFocusDay(trip.days);
  const dayOfEnabled = env.itineraryV2DayOf;

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

  // IntersectionObserver — fires onVisibleDayChange when a chapter section
  // enters the viewport. Only created when the callback is provided (SSR-safe).
  useEffect(() => {
    if (!onVisibleDayChange) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;

        // Pick the section whose top is closest to the viewport top (i.e. the
        // chapter the reader is most likely focused on). Sections with a
        // negative top have scrolled past — prefer the one least-negative.
        const best = intersecting.reduce((acc, cur) => {
          const accTop = acc.boundingClientRect.top;
          const curTop = cur.boundingClientRect.top;
          if (accTop >= 0 && curTop < 0) return acc;
          if (curTop >= 0 && accTop < 0) return cur;
          return Math.abs(curTop) < Math.abs(accTop) ? cur : acc;
        });

        const target = best.target as HTMLElement;
        const idxAttr = target.dataset.dayIndex;
        if (!idxAttr) return;
        const idx = parseInt(idxAttr, 10);
        if (Number.isNaN(idx)) return;
        if (idx === lastReportedIdx.current) return;
        lastReportedIdx.current = idx;
        onVisibleDayChange(idx);
      },
      {
        // Pushes detection zone so a chapter is "active" when its header is
        // near the top of the viewport, not when its last beat leaves the bottom.
        rootMargin: "-10% 0px -60% 0px",
        threshold: [0, 0.1, 0.25],
      },
    );

    for (const el of sectionRefs.current.values()) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [trip.days.length, onVisibleDayChange]);

  return (
    <div>
      {trip.days.map((day, idx) => (
        <section
          key={day.id}
          id={`day-${idx + 1}`}
          data-day-index={idx}
          ref={(el) => {
            if (el) sectionRefs.current.set(idx, el);
            else sectionRefs.current.delete(idx);
          }}
          className={idx === 0 ? "pt-8" : "py-10 sm:py-14 lg:py-20"}
        >
          <ChapterHeader
            dayIndex={idx}
            city={day.city}
            date={formatDateDisplay(day.date)}
            intro={day.intro}
          />
          <InlineDayNote notes={day.inlineNotes} onReview={onReviewAdvisories} />
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
            <>
              {day.beats.length > 0 && (
                <Spine>
                  {day.beats.map((beat, beatIdx) => {
                    const currentBeatIdx = currentBeatIndexByDay.get(day.id) ?? -1;
                    const isCurrent = idx === focusDayIdx && beatIdx === currentBeatIdx;
                    const isPast = idx === focusDayIdx && beatIdx < currentBeatIdx;

                    return (
                      <div
                        key={beat.id}
                        ref={idx === 0 && beatIdx === day.beats.length - 1 ? (el) => { day1LastBeatRef.current = el; } : undefined}
                      >
                        <Beat
                          time={beat.time}
                          partOfDay={beat.partOfDay}
                          location={beat.location}
                          body={beat.body}
                          isPast={isPast}
                          isCurrent={isCurrent}
                          chips={beat.chips}
                          hasMore={beat.hasMore}
                          onExpand={() => onExpandBeat(beat.id)}
                        />
                        {beat.transitToNext && beatIdx < day.beats.length - 1 && (
                          <BeatTransit {...beat.transitToNext} />
                        )}
                      </div>
                    );
                  })}
                </Spine>
              )}
              {!isReadOnly && onAddActivity && (
                <div className="mt-8 pl-[30px]">
                  <InlineAddActivity
                    dayActivities={day.dayActivities}
                    onAdd={(activity, meta) => onAddActivity(idx, activity, meta)}
                  />
                </div>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
