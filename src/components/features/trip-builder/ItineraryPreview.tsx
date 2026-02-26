"use client";

import { useMemo } from "react";

import { useTripBuilder } from "@/context/TripBuilderContext";
import { getCityMetadata } from "@/lib/tripBuilder/cityRelevance";
import { INTEREST_CATEGORIES } from "@/data/interests";
import type { InterestId } from "@/types/trip";

type DayPreview = {
  dayNumber: number;
  date: string | null;
  dateLabel: string;
  city: string | null;
  locationCount: number;
  matchingInterests: InterestId[];
};

export function ItineraryPreview() {
  const { data } = useTripBuilder();

  const duration = data.duration ?? 0;
  const startDate = data.dates.start;
  const cities = data.cities ?? [];
  const interests = data.interests ?? [];

  // Generate day previews
  const dayPreviews = useMemo<DayPreview[]>(() => {
    if (duration === 0) {
      return [];
    }

    const previews: DayPreview[] = [];

    for (let i = 0; i < duration; i++) {
      let date: string | null = null;
      let dateLabel = `Day ${i + 1}`;

      if (startDate) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        date = dayDate.toISOString().split("T")[0] ?? null;

        const formatter = new Intl.DateTimeFormat(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        dateLabel = formatter.format(dayDate);
      }

      // Distribute cities across days
      let city: string | null = null;
      let locationCount = 0;
      let matchingInterests: InterestId[] = [];

      if (cities.length > 0) {
        // Simple distribution: cycle through cities
        const cityIndex = i % cities.length;
        city = cities[cityIndex] ?? null;

        if (city) {
          const metadata = getCityMetadata(city);
          locationCount = metadata?.locationCount ?? 0;

          // Get interests that match this city
          // In production, filter based on actual city interest data
          matchingInterests = [...interests]; // All selected interests shown for now
        }
      }

      previews.push({
        dayNumber: i + 1,
        date,
        dateLabel,
        city,
        locationCount,
        matchingInterests,
      });
    }

    return previews;
  }, [duration, startDate, cities, interests]);

  // Get interest labels
  const interestLabels = useMemo(() => {
    const map = new Map<InterestId, string>();
    for (const cat of INTEREST_CATEGORIES) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, []);

  if (dayPreviews.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <p className="text-sm text-stone">
            Pick your dates to see a day-by-day outline.
          </p>
        </div>
      </div>
    );
  }

  // Check if we should show a "long trip" note
  const isLongTrip = duration > 7;

  return (
    <div className="flex flex-col">
      {isLongTrip && (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2">
          <p className="text-xs text-warning">
            This is a simplified preview for {duration} days. The full itinerary will have more detail.
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        {dayPreviews.map((day, index) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            interestLabels={interestLabels}
            isFirst={index === 0}
            isLast={index === dayPreviews.length - 1}
            nextCity={dayPreviews[index + 1]?.city ?? null}
            previousCity={index > 0 ? dayPreviews[index - 1]?.city ?? null : null}
          />
        ))}
      </div>

      {cities.length === 0 && (
        <div className="border-t border-border bg-surface px-4 py-3">
          <p className="text-xs text-stone">
            Add cities to see how the days break down.
          </p>
        </div>
      )}

      {interests.length === 0 && cities.length > 0 && (
        <div className="border-t border-border bg-surface px-4 py-3">
          <p className="text-xs text-stone">
            Pick interests to see activity ideas.
          </p>
        </div>
      )}
    </div>
  );
}

type DayCardProps = {
  day: DayPreview;
  interestLabels: Map<InterestId, string>;
  isFirst: boolean;
  isLast: boolean;
  nextCity: string | null;
  previousCity: string | null;
};

function DayCard({
  day,
  interestLabels,
  isFirst,
  isLast,
  nextCity,
  previousCity,
}: DayCardProps) {
  const showTravelIndicator = day.city && nextCity && day.city !== nextCity;
  const showArrival = isFirst && day.city;
  const isDifferentFromPrevious = day.city && previousCity && day.city !== previousCity;

  return (
    <div className="px-4 py-3">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage/10 text-xs font-semibold text-sage">
            {day.dayNumber}
          </span>
          <span className="text-sm font-medium text-foreground">{day.dateLabel}</span>
        </div>

        {day.city && (
          <span className="text-sm text-foreground-secondary">{day.city}</span>
        )}
      </div>

      {/* Day content */}
      <div className="mt-2 ml-8">
        {!day.city ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-3 py-2">
            <p className="text-xs text-stone">No city assigned</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Arrival indicator */}
            {(showArrival || isDifferentFromPrevious) && (
              <div className="flex items-center gap-2 text-xs text-stone">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>
                  {isFirst ? "Arrive in" : "Travel to"} {day.city}
                </span>
              </div>
            )}

            {/* Location count */}
            <div className="flex items-center gap-2 text-xs text-foreground-secondary">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{day.locationCount} locations available</span>
            </div>

            {/* Interest tags */}
            {day.matchingInterests.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {day.matchingInterests.slice(0, 3).map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground-secondary"
                  >
                    {interestLabels.get(interest) ?? interest}
                  </span>
                ))}
                {day.matchingInterests.length > 3 && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-stone">
                    +{day.matchingInterests.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Travel indicator to next city */}
        {showTravelIndicator && (
          <div className="mt-3 flex items-center gap-2 text-xs text-stone">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>Travel to {nextCity}</span>
          </div>
        )}

        {/* Departure indicator */}
        {isLast && day.city && (
          <div className="mt-3 flex items-center gap-2 text-xs text-stone">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>End of trip</span>
          </div>
        )}
      </div>
    </div>
  );
}
