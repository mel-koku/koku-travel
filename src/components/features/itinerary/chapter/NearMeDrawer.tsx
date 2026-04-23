"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { SlideDrawer } from "./SlideDrawer";
import { cn } from "@/lib/utils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { createActivityFromLocation } from "@/lib/itinerary/createActivityFromLocation";
import type { Location } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";

type NearbyLocation = Location & { distance: number };

type NearMeState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "loading" }
  | { status: "results"; items: NearbyLocation[] }
  | { status: "empty" }
  | { status: "error"; message: string };

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function NearMeRow({
  location,
  isAdded,
  onAdd,
}: {
  location: NearbyLocation;
  isAdded: boolean;
  onAdd: () => void;
}) {
  const imageSrc =
    resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 400) ?? FALLBACK_IMAGE;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-sm)]">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-canvas">
        <Image
          src={imageSrc || FALLBACK_IMAGE}
          alt={location.name}
          fill
          className="object-cover"
          sizes="56px"
          priority={false}
        />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground line-clamp-1">{location.name}</p>
        <p className="text-xs text-stone capitalize">
          {location.category}
          {location.rating ? ` · ★ ${location.rating.toFixed(1)}` : ""}
          {" · "}
          {formatDistance(location.distance)}
        </p>
      </div>
      <button
        type="button"
        onClick={isAdded ? undefined : onAdd}
        disabled={isAdded}
        aria-label={isAdded ? `${location.name} added` : `Add ${location.name} to today`}
        className={cn(
          "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          isAdded
            ? "bg-canvas text-foreground-secondary cursor-default"
            : "bg-brand-primary text-white hover:bg-brand-secondary active:scale-[0.98]",
        )}
      >
        {isAdded ? "Added" : "Add"}
      </button>
    </div>
  );
}

export type NearMeDrawerProps = {
  open: boolean;
  onClose: () => void;
  currentDayIndex: number;
  currentDayActivities: ItineraryActivity[];
  onAdd: (
    dayIndex: number,
    activity: Extract<ItineraryActivity, { kind: "place" }>,
    meta: { addressSource: "none" },
  ) => void;
};

export function NearMeDrawer({
  open,
  onClose,
  currentDayIndex,
  currentDayActivities,
  onAdd,
}: NearMeDrawerProps) {
  const [state, setState] = useState<NearMeState>({ status: "idle" });
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setState({ status: "idle" });
      setAdded(new Set());
      return;
    }

    setState({ status: "requesting" });

    if (!navigator.geolocation) {
      setState({ status: "error", message: "Geolocation is not supported by your browser." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState({ status: "loading" });
        const { latitude: lat, longitude: lng } = coords;

        fetch(`/api/locations/nearby?lat=${lat}&lng=${lng}&radius=1.5&limit=20`)
          .then((r) => r.json())
          .then((data: { data?: NearbyLocation[] }) => {
            const items = data.data ?? [];
            setState(items.length > 0 ? { status: "results", items } : { status: "empty" });
          })
          .catch(() => {
            setState({ status: "error", message: "Failed to load nearby places." });
          });
      },
      () => {
        setState({
          status: "error",
          message: "Location access denied. Enable it in your browser settings.",
        });
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, [open]);

  const handleAdd = useCallback(
    (location: NearbyLocation) => {
      const activity = createActivityFromLocation(location, currentDayActivities);
      onAdd(currentDayIndex, activity, { addressSource: "none" });
      setAdded((prev) => new Set([...prev, location.id]));
    },
    [currentDayIndex, currentDayActivities, onAdd],
  );

  return (
    <SlideDrawer open={open} onClose={onClose} title="Near Me" ariaLabel="Nearby places">
      {(state.status === "requesting" || state.status === "loading") && (
        <div className="flex items-center justify-center py-16 text-sm text-foreground-secondary">
          {state.status === "requesting" ? "Getting your location..." : "Finding nearby places..."}
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg bg-canvas px-5 py-4 text-sm text-foreground-secondary">
          {state.message}
        </div>
      )}

      {state.status === "empty" && (
        <div className="py-16 text-center text-sm text-foreground-secondary">
          No places found within 1.5 km.
        </div>
      )}

      {state.status === "results" && (
        <div className="space-y-3">
          <p className="text-xs text-foreground-secondary">
            {state.items.length} place{state.items.length !== 1 ? "s" : ""} within 1.5 km
          </p>
          {state.items.map((loc) => (
            <NearMeRow
              key={loc.id}
              location={loc}
              isAdded={added.has(loc.id)}
              onAdd={() => handleAdd(loc)}
            />
          ))}
        </div>
      )}
    </SlideDrawer>
  );
}
