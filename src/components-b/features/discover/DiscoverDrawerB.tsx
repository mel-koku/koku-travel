"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSaved } from "@/context/SavedContext";
import { resizePhotoUrl } from "@/lib/google/transformations";
import { getCategoryHexColor } from "@/lib/itinerary/activityColors";
import type { NearbyLocation } from "@/hooks/useLocationsQuery";

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

/* ── Mobile drag thresholds ── */
const PEEK_HEIGHT = 180;
const EXPANDED_VH = 50;
const DRAG_THRESHOLD = 40;

type DiscoverDrawerBProps = {
  locations: NearbyLocation[];
  highlightedLocationId: string | null;
  onLocationHover: (locationId: string | null) => void;
  onLocationClick: (locationId: string) => void;
};

export function DiscoverDrawerB({
  locations,
  highlightedLocationId,
  onLocationHover,
  onLocationClick,
}: DiscoverDrawerBProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const [dragging, setDragging] = useState(false);

  // Auto-scroll to highlighted card
  useEffect(() => {
    if (!highlightedLocationId || !scrollRef.current) return;
    const card = scrollRef.current.querySelector(
      `[data-drawer-id="${highlightedLocationId}"]`,
    );
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [highlightedLocationId]);

  /* ── Mobile drag handlers ── */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    dragStartY.current = touch.clientY;
    dragDelta.current = 0;
    setDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    dragDelta.current = touch.clientY - dragStartY.current;
  }, []);

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    if (dragStartY.current === null) return;
    const delta = dragDelta.current;
    dragStartY.current = null;

    if (delta < -DRAG_THRESHOLD) {
      setExpanded(true);
    } else if (delta > DRAG_THRESHOLD) {
      setExpanded(false);
    }
  }, []);

  if (locations.length === 0) return null;

  return (
    <>
      {/* ── Mobile drawer ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex flex-col bg-white md:hidden"
        style={{
          height: expanded ? `${EXPANDED_VH}dvh` : PEEK_HEIGHT,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          transition: dragging ? "none" : "height 0.3s ease",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-2.5 cursor-grab active:cursor-grabbing shrink-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
        </div>

        {/* Title */}
        <div className="flex items-center justify-between px-4 pb-2 shrink-0">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {locations.length} {locations.length === 1 ? "place" : "places"} nearby
          </p>
          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Collapse
            </button>
          )}
        </div>

        {/* Cards — vertical scroll */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3 space-y-2"
          data-lenis-prevent
        >
          {locations.map((loc) => (
            <DrawerCard
              key={loc.id}
              location={loc}
              isHighlighted={loc.id === highlightedLocationId}
              onHover={onLocationHover}
              onClick={onLocationClick}
            />
          ))}
        </div>
      </div>

      {/* ── Desktop bottom strip ── */}
      <div
        className="hidden md:block fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur-sm"
        style={{
          height: 140,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center h-full px-4 gap-3">
          <p className="shrink-0 text-xs font-semibold text-[var(--foreground)] pr-1 writing-mode-vertical hidden lg:block"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {locations.length} nearby
          </p>
          <div
            className="flex-1 flex gap-3 overflow-x-auto overscroll-contain snap-x snap-mandatory py-2 scroll-pl-3"
            data-lenis-prevent
          >
            {locations.map((loc) => (
              <DrawerCard
                key={loc.id}
                location={loc}
                isHighlighted={loc.id === highlightedLocationId}
                onHover={onLocationHover}
                onClick={onLocationClick}
                horizontal
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Single card ── */

type DrawerCardProps = {
  location: NearbyLocation;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  horizontal?: boolean;
};

const DrawerCard = memo(function DrawerCard({
  location,
  isHighlighted,
  onHover,
  onClick,
  horizontal,
}: DrawerCardProps) {
  const { isInSaved, toggleSave } = useSaved();
  const saved = isInSaved(location.id);
  const imageSrc = resizePhotoUrl(location.primaryPhotoUrl ?? location.image, 128);
  const categoryColor = getCategoryHexColor(location.category);

  const distanceLabel =
    location.distance < 1
      ? `${Math.round(location.distance * 1000)}m`
      : `${location.distance.toFixed(1)}km`;

  return (
    <div
      data-drawer-id={location.id}
      className={`group flex items-center gap-3 rounded-2xl bg-white p-2.5 transition-all cursor-pointer ${
        horizontal ? "shrink-0 w-72 snap-start" : "w-full"
      } ${isHighlighted ? "ring-2 ring-[var(--primary)]/30" : ""}`}
      style={{ boxShadow: "var(--shadow-card)" }}
      onMouseEnter={() => onHover(location.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(location.id)}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={imageSrc || FALLBACK_IMAGE}
          alt={location.name}
          fill
          className="object-cover"
          sizes="64px"
        />
        {/* Category dot */}
        <div
          className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full border border-white"
          style={{ backgroundColor: categoryColor }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <Link
            href={`/b/places/${location.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors"
          >
            {location.name}
          </Link>
          {/* Save heart */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleSave(location.id);
            }}
            aria-label={saved ? "Unsave" : "Save"}
            className="shrink-0 p-1 -m-1"
          >
            <svg
              className={`h-4 w-4 transition-colors ${
                saved
                  ? "fill-[var(--primary)] stroke-[var(--primary)]"
                  : "fill-none stroke-[var(--muted-foreground)] group-hover:stroke-[var(--foreground)]"
              }`}
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19.5 13.572a24.064 24.064 0 0 1-7.5 7.178 24.064 24.064 0 0 1-7.5-7.178C3.862 12.334 3 10.478 3 8.52 3 5.989 5.014 4 7.5 4c1.54 0 2.994.757 4 1.955C12.506 4.757 13.96 4 15.5 4 17.986 4 20 5.989 20 8.52c0 1.958-.862 3.813-2.5 5.052Z" />
            </svg>
          </button>
        </div>

        {/* Second line: city + rating */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-[var(--muted-foreground)] capitalize truncate">
            {location.category}
          </span>
          {location.rating && (
            <>
              <span className="text-[var(--border)]">&middot;</span>
              <span className="flex items-center gap-0.5 text-xs text-[var(--foreground)]">
                <svg className="h-2.5 w-2.5 text-[var(--warning)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
                </svg>
                {location.rating.toFixed(1)}
              </span>
            </>
          )}
          <span className="text-[var(--border)]">&middot;</span>
          <span className="text-xs text-[var(--muted-foreground)]">{distanceLabel}</span>
        </div>
      </div>
    </div>
  );
});
