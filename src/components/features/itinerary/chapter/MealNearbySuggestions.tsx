"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItineraryActivity } from "@/types/itinerary";

type MealType = "breakfast" | "lunch" | "dinner";

export type MealNearbyAnchor = {
  lat: number;
  lng: number;
  /** Display label, e.g. "APA Hotel" or "Sensoji Temple". */
  label: string;
  /** Day's planning city, e.g. "Tokyo". Anchors the LLM so generic chain
   * names ("APA Hotel") don't get matched to the wrong city. */
  cityLabel?: string;
};

export type MealNearbySuggestionsProps = {
  mealType: MealType;
  anchor: MealNearbyAnchor;
  /** Activities already on the day — used to exclude duplicates by name match. */
  dayActivities: ItineraryActivity[];
  onPick: (activity: Extract<ItineraryActivity, { kind: "place" }>) => void;
};

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
};

type ApiPlace = {
  placeId: string;
  name: string;
  blurb: string;
  address?: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  ratingCount?: number;
  primaryType?: string;
  photoUrl?: string;
};

export function MealNearbySuggestions({
  mealType,
  anchor,
  dayActivities,
  onPick,
}: MealNearbySuggestionsProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [results, setResults] = useState<ApiPlace[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch("/api/places/nearby-food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: anchor.lat,
        lng: anchor.lng,
        mealType,
        anchorLabel: anchor.label,
        cityLabel: anchor.cityLabel,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((payload) => {
        if (cancelled) return;
        const places = (payload?.places ?? []) as ApiPlace[];
        // Drop any place already on this day (loose name match).
        const existingNames = new Set(
          dayActivities
            .filter((a): a is Extract<ItineraryActivity, { kind: "place" }> => a.kind === "place")
            .map((a) => a.title.toLowerCase()),
        );
        setResults(places.filter((p) => !existingNames.has(p.name.toLowerCase())));
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [anchor.lat, anchor.lng, anchor.label, anchor.cityLabel, mealType, dayActivities]);

  const handlePick = (place: ApiPlace) => {
    // Google-resolved places aren't in our catalog, so they enter as custom
    // activities (matching the flow used by the existing Add custom tab).
    // The place.placeId is encoded into the activity id so a future job can
    // promote popular picks into the catalog.
    const activity: Extract<ItineraryActivity, { kind: "place" }> = {
      kind: "place",
      id: `custom-${place.placeId}`,
      title: place.name,
      timeOfDay:
        mealType === "breakfast" ? "morning" : mealType === "lunch" ? "afternoon" : "evening",
      coordinates: place.coordinates,
      mealType,
      isCustom: true,
      address: place.address,
      notes: place.blurb,
      photoUrl: place.photoUrl,
    };
    onPick(activity);
  };

  return (
    <div className="mb-3 rounded-md border border-border bg-canvas/40 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="eyebrow-editorial">Suggested {MEAL_LABEL[mealType]}</div>
        <div className="text-xs text-foreground-secondary truncate">
          near {anchor.label}
        </div>
      </div>

      {status === "loading" && (
        <ul className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="flex h-16 items-center gap-3 rounded-md bg-surface px-2 animate-pulse"
            >
              <div className="h-12 w-12 rounded-md bg-canvas" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded-sm bg-canvas" />
                <div className="h-2 w-full rounded-sm bg-canvas" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === "error" && (
        <p className="text-sm text-foreground-secondary">
          Couldn&apos;t load suggestions. Try the search below.
        </p>
      )}

      {status === "ready" && results.length === 0 && (
        <p className="text-sm text-foreground-secondary">
          We couldn&apos;t find good options nearby. Search by name below or
          add a custom stop.
        </p>
      )}

      {status === "ready" && results.length > 0 && (
        <ul className="space-y-1.5">
          {results.map((place) => (
            <li key={place.placeId}>
              <button
                type="button"
                onClick={() => handlePick(place)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-md bg-surface p-2 text-left",
                  "hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                  "transition-colors",
                )}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-canvas">
                  {place.photoUrl && (
                    <Image
                      src={place.photoUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground group-hover:text-brand-primary">
                    {place.name}
                  </div>
                  <div className="text-xs text-foreground-secondary line-clamp-2">
                    {place.blurb}
                  </div>
                  {(typeof place.rating === "number" && place.rating > 0) && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-foreground-secondary">
                      <Star className="h-3 w-3 fill-current text-warning" aria-hidden />
                      <span className="font-medium text-foreground">{place.rating.toFixed(1)}</span>
                      {place.ratingCount && (
                        <span>({place.ratingCount.toLocaleString()})</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
