"use client";

import { useEffect, useRef } from "react";
import { ChapterHeader } from "./ChapterHeader";
import { Spine } from "./Spine";
import { Beat, type BeatChip } from "./Beat";
import { BeatTransit } from "./BeatTransit";
import { InlineDayNote, type InlineDayNoteEntry } from "./InlineDayNote";
import type { Location } from "@/types/location";
import { getGtag } from "@/lib/analytics/customLocations";

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
              {day.beats.map((beat, beatIdx) => (
                <div
                  key={beat.id}
                  ref={idx === 0 && beatIdx === day.beats.length - 1 ? (el) => { day1LastBeatRef.current = el; } : undefined}
                >
                  <Beat
                    time={beat.time}
                    partOfDay={beat.partOfDay}
                    location={beat.location}
                    body={beat.body}
                    isPast={false /* Phase 4 overrides via Task 30 */}
                    chips={beat.chips}
                    hasMore={beat.hasMore}
                    onExpand={() => onExpandBeat(beat.id)}
                  />
                  {beat.transitToNext && beatIdx < day.beats.length - 1 && (
                    <BeatTransit {...beat.transitToNext} />
                  )}
                </div>
              ))}
            </Spine>
          )}
        </section>
      ))}
    </div>
  );
}
