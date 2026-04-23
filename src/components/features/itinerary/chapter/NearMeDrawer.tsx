"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, Clock, Train } from "lucide-react";
import { SlideDrawer } from "./SlideDrawer";
import { NearMeMap, type NearbyLocation } from "./NearMeMap";
import { cn } from "@/lib/utils";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { createActivityFromLocation } from "@/lib/itinerary/createActivityFromLocation";
import type { ItineraryActivity } from "@/types/itinerary";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

type NearMeState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "loading"; coords: { lat: number; lng: number } }
  | { status: "results"; coords: { lat: number; lng: number }; items: NearbyLocation[] }
  | { status: "empty"; coords: { lat: number; lng: number } }
  | { status: "error"; message: string };

// ── Detail panel ──────────────────────────────────────────────────────────────

function priceLevelLabel(level: number | undefined | null): string | null {
  if (level == null) return null;
  if (level === 0) return "Free";
  return "¥".repeat(level);
}

function NearMeDetail({
  location,
  isAdded,
  onAdd,
  onBack,
}: {
  location: NearbyLocation;
  isAdded: boolean;
  onAdd: () => void;
  onBack: () => void;
}) {
  const imageSrc =
    resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 600) ??
    FALLBACK_IMAGE;

  const priceLabel = priceLevelLabel(location.priceLevel);
  // Prefer the full editorial description; fall back to the card blurb
  const bodyText = location.description ?? location.shortDescription;
  const metaParts: string[] = [location.category ?? ""];
  if (location.rating) metaParts.push(`★ ${location.rating.toFixed(1)}`);
  if (priceLabel) metaParts.push(priceLabel);
  metaParts.push(formatDistance(location.distance));

  return (
    <div className="space-y-4 pb-2">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        All places
      </button>

      {imageSrc && imageSrc !== FALLBACK_IMAGE && (
        <div className="relative h-44 w-full overflow-hidden rounded-lg bg-canvas">
          <Image
            src={imageSrc}
            alt={location.name}
            fill
            className="object-cover"
            sizes="520px"
            priority={false}
          />
        </div>
      )}

      {/* Name + meta */}
      <div>
        <p className="text-base font-medium text-foreground">{location.name}</p>
        <p className="mt-0.5 text-sm text-foreground-secondary capitalize">
          {metaParts.join(" · ")}
        </p>
        {(location.neighborhood || location.estimatedDuration) && (
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {[location.neighborhood, location.estimatedDuration]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      {/* Description */}
      {bodyText && (
        <p className="text-sm text-foreground-body leading-relaxed">
          {bodyText}
        </p>
      )}

      {/* Insider tip */}
      {location.insiderTip && (
        <div>
          <p className="eyebrow-mono mb-1.5">Local tip</p>
          <div className="rounded-lg bg-yuzu-tint px-3 py-2.5">
            <p className="text-sm leading-relaxed text-foreground-body">
              {location.insiderTip}
            </p>
          </div>
        </div>
      )}

      {/* Nearest station */}
      {location.nearestStation && (
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Train className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{location.nearestStation}</span>
        </div>
      )}

      {/* Duration standalone (if not shown in meta above) */}
      {location.estimatedDuration && !location.neighborhood && (
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{location.estimatedDuration}</span>
        </div>
      )}

      <button
        type="button"
        onClick={isAdded ? undefined : onAdd}
        disabled={isAdded}
        className={cn(
          "w-full rounded-lg py-3 text-sm font-medium transition-colors active:scale-[0.98]",
          isAdded
            ? "bg-canvas text-foreground-secondary cursor-default"
            : "bg-brand-primary text-white hover:bg-brand-secondary",
        )}
      >
        {isAdded ? "Added to today's itinerary" : "Add to today's itinerary"}
      </button>
    </div>
  );
}

// ── Compact list row ───────────────────────────────────────────────────────────

function NearMeListRow({
  location,
  isAdded,
  onSelect,
}: {
  location: NearbyLocation;
  isAdded: boolean;
  onSelect: () => void;
}) {
  const thumb = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 120);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg bg-surface px-3 py-2.5 text-left shadow-[var(--shadow-sm)] transition-colors hover:bg-canvas active:scale-[0.99]"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-canvas">
        {thumb ? (
          <Image
            src={thumb}
            alt={location.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : null}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground line-clamp-1">{location.name}</p>
        <p className="text-xs text-foreground-secondary capitalize">
          {location.category}
          {location.rating ? ` · ★ ${location.rating.toFixed(1)}` : ""}
          {" · "}
          {formatDistance(location.distance)}
        </p>
      </div>
      {isAdded && (
        <span className="shrink-0 text-xs text-foreground-secondary">Added</span>
      )}
    </button>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setState({ status: "idle" });
      setSelectedId(null);
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
        const { latitude: lat, longitude: lng } = coords;
        setState({ status: "loading", coords: { lat, lng } });

        fetch(`/api/locations/nearby?lat=${lat}&lng=${lng}&radius=1.5&limit=20`)
          .then((r) => r.json())
          .then((data: { data?: NearbyLocation[] }) => {
            const items = data.data ?? [];
            setState(
              items.length > 0
                ? { status: "results", coords: { lat, lng }, items }
                : { status: "empty", coords: { lat, lng } },
            );
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

  const handleLocationClick = useCallback((location: NearbyLocation) => {
    setSelectedId(location.id);
  }, []);

  const hasCoords =
    state.status === "loading" ||
    state.status === "results" ||
    state.status === "empty";

  const items = state.status === "results" ? state.items : [];
  const coords = hasCoords ? state.coords : null;
  const selected = selectedId ? items.find((l) => l.id === selectedId) ?? null : null;

  return (
    <SlideDrawer open={open} onClose={onClose} title="Near Me" ariaLabel="Nearby places" noPadding>
      <div className="flex h-full flex-col">
        {/* Map area — always 260px tall when we have coordinates */}
        {coords ? (
          <div className="relative h-[260px] shrink-0 bg-canvas">
            <NearMeMap
              userLocation={coords}
              locations={items}
              selectedId={selectedId}
              onLocationClick={handleLocationClick}
            />
            {state.status === "loading" && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
                <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs text-foreground-secondary backdrop-blur-sm shadow-[var(--shadow-sm)]">
                  Finding nearby places...
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-8 text-sm text-foreground-secondary">
            {state.status === "requesting" && "Getting your location..."}
            {state.status === "error" && (
              <div className="rounded-lg bg-canvas px-5 py-4 text-center">
                {state.message}
              </div>
            )}
          </div>
        )}

        {/* Content below map */}
        {coords && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {selected ? (
              <NearMeDetail
                location={selected}
                isAdded={added.has(selected.id)}
                onAdd={() => handleAdd(selected)}
                onBack={() => setSelectedId(null)}
              />
            ) : state.status === "empty" ? (
              <p className="text-center text-sm text-foreground-secondary py-8">
                No places found within 1.5 km.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-foreground-secondary mb-3">
                  {items.length} place{items.length !== 1 ? "s" : ""} within 1.5 km — tap a pin or row
                </p>
                {items.map((loc) => (
                  <NearMeListRow
                    key={loc.id}
                    location={loc}
                    isAdded={added.has(loc.id)}
                    onSelect={() => handleLocationClick(loc)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SlideDrawer>
  );
}
