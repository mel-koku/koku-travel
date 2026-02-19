"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { Location } from "@/types/location";
import type { NearbyLocation } from "@/hooks/useLocationsQuery";
import { useWishlist } from "@/context/WishlistContext";
import { useFirstFavoriteToast } from "@/hooks/useFirstFavoriteToast";
import { PracticalBadges } from "@/components/ui/PracticalBadges";
import { HeartIcon } from "./LocationCard";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { easeReveal, durationBase } from "@/lib/motion";

const CATEGORY_CHIPS = [
  { id: "", label: "All" },
  { id: "restaurant", label: "Food" },
  { id: "culture", label: "Culture" },
  { id: "nature", label: "Nature" },
  { id: "bar", label: "Nightlife" },
  { id: "shopping", label: "Shopping" },
] as const;

type DiscoverNowPanelProps = {
  locations: NearbyLocation[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onSelectLocation: (location: Location) => void;
  onSurpriseMe: () => void;
};

export function DiscoverNowPanel({
  locations,
  isLoading,
  error,
  selectedCategory,
  onCategoryChange,
  onSelectLocation,
  onSurpriseMe,
}: DiscoverNowPanelProps) {
  return (
    <div className="space-y-4">
      {/* Open now indicator */}
      <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sage" />
        </span>
        <span className="text-xs text-sage font-medium">Showing open now</span>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 sm:px-6 lg:px-8">
        {CATEGORY_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onCategoryChange(chip.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              selectedCategory === chip.id
                ? "bg-brand-primary text-white"
                : "bg-surface text-foreground-secondary border border-border/50 hover:border-brand-primary/30"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl bg-surface/50 p-3 animate-pulse">
                <div className="h-20 w-20 shrink-0 rounded-lg bg-sand/30" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-2/3 rounded bg-sand/30" />
                  <div className="h-2.5 w-1/3 rounded bg-sand/20" />
                  <div className="h-2.5 w-1/2 rounded bg-sand/20" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
            <p className="text-sm text-error">{error}</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface/30 p-8 text-center">
            <p className="font-serif italic text-lg text-foreground mb-1">
              Nothing nearby right now
            </p>
            <p className="text-sm text-stone">
              Try expanding your radius or check back later.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {locations.map((location, i) => (
                <motion.div
                  key={location.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: easeReveal }}
                >
                  <DiscoverCard
                    location={location}
                    onSelect={onSelectLocation}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Surprise Me FAB */}
      {locations.length > 0 && (
        <div className="sticky bottom-6 flex justify-center pointer-events-none z-20">
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: durationBase, ease: easeReveal, delay: 0.3 }}
            onClick={onSurpriseMe}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-brand-primary/90 active:scale-[0.97] transition"
          >
            <DiceIcon />
            Surprise Me
          </motion.button>
        </div>
      )}
    </div>
  );
}

const DiscoverCard = memo(function DiscoverCard({
  location,
  onSelect,
}: {
  location: NearbyLocation;
  onSelect: (location: Location) => void;
}) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(location.id);
  const showFirstFavoriteToast = useFirstFavoriteToast();
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 200);

  const distanceLabel = useMemo(() => {
    if (!location.distance) return null;
    if (location.distance < 1000) return `${location.distance}m`;
    return `${(location.distance / 1000).toFixed(1)}km`;
  }, [location.distance]);

  return (
    <article
      onClick={() => onSelect(location)}
      className="group flex gap-3 rounded-xl bg-surface/40 p-2.5 cursor-pointer border border-transparent hover:border-brand-primary/20 hover:bg-surface/70 transition"
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={imageSrc || ""}
          alt={location.name}
          fill
          className="object-cover"
          sizes="80px"
        />
        {location.isHiddenGem && (
          <div className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-secondary/80 text-[9px] text-white" title="Hidden gem">
            ◆
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-serif italic text-sm text-foreground line-clamp-1 group-hover:text-brand-primary transition-colors">
              {location.name}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-stone">
              <span className="uppercase tracking-wide font-mono">{location.category}</span>
              {distanceLabel && (
                <>
                  <span className="text-border">·</span>
                  <span className="font-mono">{distanceLabel}</span>
                </>
              )}
              {location.rating && (
                <>
                  <span className="text-border">·</span>
                  <span className="font-mono">★ {location.rating.toFixed(1)}</span>
                </>
              )}
            </div>
          </div>

          {/* Heart */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!active) showFirstFavoriteToast();
              toggleWishlist(location.id);
            }}
            aria-label={active ? "Remove from favorites" : "Save"}
            className="shrink-0 mt-0.5"
          >
            <HeartIcon active={active} animating={false} variant="overlay" />
          </button>
        </div>

        {/* Practical badges */}
        <div className="mt-1">
          <PracticalBadges location={location} max={2} />
        </div>
      </div>
    </article>
  );
});

function DiceIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}
