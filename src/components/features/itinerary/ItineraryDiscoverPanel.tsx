"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CATEGORY_CHIPS } from "@/lib/constants/discoverCategories";
import { getCategoryHexColor } from "@/lib/itinerary/activityColors";
import type { DiscoverCategoryId } from "@/lib/constants/discoverCategories";
import type { NearbyLocation } from "@/hooks/useLocationsQuery";
import type { Location } from "@/types/location";

type ItineraryDiscoverPanelProps = {
  locations: NearbyLocation[];
  isLoading: boolean;
  category: DiscoverCategoryId;
  onCategoryChange: (id: DiscoverCategoryId) => void;
  openNow: boolean;
  onOpenNowChange: (v: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  highlightedLocationId: string | null;
  onHighlightChange: (id: string | null) => void;
  onLocationClick: (location: Location) => void;
  onAddToDay: (location: Location) => void;
  usedLocationIds: Set<string>;
  dayLabel: string;
  userPosition: { lat: number; lng: number } | null;
  onRequestGeolocation: () => void;
  geoLoading: boolean;
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function ItineraryDiscoverPanel({
  locations,
  isLoading,
  category,
  onCategoryChange,
  openNow,
  onOpenNowChange,
  searchQuery,
  onSearchQueryChange,
  highlightedLocationId,
  onHighlightChange,
  onLocationClick,
  onAddToDay,
  usedLocationIds,
  dayLabel,
  userPosition,
  onRequestGeolocation,
  geoLoading,
}: ItineraryDiscoverPanelProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="space-y-2.5 border-b border-border px-4 pb-3 pt-3">
        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto overscroll-contain scrollbar-hide">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onCategoryChange(chip.id as DiscoverCategoryId)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                category === chip.id
                  ? "bg-brand-primary text-white"
                  : "bg-surface text-stone hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Search + Open Now */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <svg
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search nearby..."
              className="h-9 w-full rounded-xl border border-border bg-surface pl-8 pr-3 text-sm text-foreground placeholder:text-stone focus:border-brand-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => onOpenNowChange(!openNow)}
            className={`flex h-9 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-xs font-medium transition-colors ${
              openNow
                ? "border-sage bg-sage/10 text-sage"
                : "border-border text-stone hover:text-foreground"
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${openNow ? "bg-sage" : "bg-stone/40"}`} />
            Open now
          </button>
        </div>

        {/* Geolocation prompt */}
        {!userPosition && (
          <button
            type="button"
            onClick={onRequestGeolocation}
            disabled={geoLoading}
            className="flex w-full items-center gap-2 rounded-xl bg-brand-primary/10 px-3 py-2 text-xs text-brand-primary transition-colors hover:bg-brand-primary/15"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1.5V4M8 12v2.5M1.5 8H4M12 8h2.5" strokeLinecap="round" />
            </svg>
            {geoLoading ? "Getting location..." : "Use my location for better results"}
          </button>
        )}
      </div>

      {/* Location list */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3" data-lenis-prevent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-sage border-t-transparent" />
          </div>
        ) : locations.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone">
            No places found nearby.
          </p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) => {
              const isUsed = usedLocationIds.has(loc.id);
              const isHighlighted = highlightedLocationId === loc.id;
              return (
                <motion.div
                  key={loc.id}
                  layout
                  onMouseEnter={() => onHighlightChange(loc.id)}
                  onMouseLeave={() => onHighlightChange(null)}
                  className={`group relative cursor-pointer rounded-xl border p-3 transition-colors ${
                    isHighlighted
                      ? "border-brand-primary/40 bg-brand-primary/5"
                      : "border-border bg-surface hover:border-brand-primary/20"
                  }`}
                  onClick={() => onLocationClick(loc)}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {loc.primaryPhotoUrl ? (
                      <Image
                        src={loc.primaryPhotoUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-canvas">
                        <svg className="h-5 w-5 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-foreground group-hover:text-brand-primary transition-colors">
                        {loc.name}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone">
                        {loc.category && (
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium"
                            style={{
                              backgroundColor: `${getCategoryHexColor(loc.category)}18`,
                              color: getCategoryHexColor(loc.category),
                            }}
                          >
                            {loc.category}
                          </span>
                        )}
                        <span>{formatDistance(loc.distance)}</span>
                        {loc.rating != null && (
                          <>
                            <span>·</span>
                            <span>★ {loc.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Add button */}
                    <div className="shrink-0">
                      {isUsed ? (
                        <span className="inline-flex items-center rounded-lg bg-sage/10 px-2 py-1 text-[10px] font-medium text-sage">
                          Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToDay(loc);
                          }}
                          className="rounded-lg bg-brand-primary px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-brand-primary/90 active:scale-[0.98]"
                        >
                          + {dayLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
