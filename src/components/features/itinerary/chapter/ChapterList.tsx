"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChapterHeader } from "./ChapterHeader";
import { Spine } from "./Spine";
import { Beat, type BeatChip } from "./Beat";
import { BeatTransit } from "./BeatTransit";
import { InlineDayNote, type InlineDayNoteEntry } from "./InlineDayNote";
import type { Location } from "@/types/location";
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
  } | null;
};

export type ChapterDay = {
  id: string;
  date: string;
  city: string;
  intro: string;
  beats: ChapterBeat[];
  inlineNotes: InlineDayNoteEntry[];
};

export type ChapterListProps = {
  trip: { id: string; name: string; days: ChapterDay[] };
  onExpandBeat: (beatId: string) => void;
  onReviewAdvisories: () => void;
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
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function ChapterList({
  trip,
  onExpandBeat,
  onReviewAdvisories,
}: ChapterListProps) {
  const day1LastBeatRef = useRef<HTMLDivElement | null>(null);
  const hasLoggedScrollDepth = useRef(false);

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

  return (
    <div>
      {trip.days.map((day, idx) => (
        <section
          key={day.id}
          id={`day-${idx + 1}`}
          className={idx === 0 ? "pt-8" : "py-12 sm:py-20 lg:py-28"}
        >
          <ChapterHeader
            dayIndex={idx}
            city={day.city}
            date={formatDateDisplay(day.date)}
            intro={day.intro}
          />
          <InlineDayNote notes={day.inlineNotes} onReview={onReviewAdvisories} />
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
        </section>
      ))}
    </div>
  );
}
