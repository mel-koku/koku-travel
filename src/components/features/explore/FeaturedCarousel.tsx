"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect, useMemo, forwardRef } from "react";
import type { Location } from "@/types/location";
import { useLocationDetailsQuery } from "@/hooks/useLocationDetailsQuery";
import { getLocationDisplayName } from "@/lib/locationNameUtils";

const LocationDetailsModal = dynamic(
  () => import("./LocationDetailsModal").then((m) => ({ default: m.LocationDetailsModal })),
  { ssr: false }
);

type FeaturedCarouselProps = {
  locations: Location[];
};

const AUTO_SCROLL_DELAY = 3300; // 3.3 seconds
const GAP = 8; // Gap between cards (appears larger due to non-spotlight scale)
const CARD_ASPECT_RATIO = 16 / 9; // Horizontal 16:9 aspect ratio for all cards

// Always show 3 columns for true center spotlight
const VISIBLE_CARDS = 3;

function getCardWidth(containerWidth: number): number {
  // Calculate card width based on container width, gap, and 3 visible cards
  const totalGap = GAP * (VISIBLE_CARDS - 1);
  return Math.floor((containerWidth - totalGap) / VISIBLE_CARDS);
}

export function FeaturedCarousel({ locations }: FeaturedCarouselProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHoveringSpotlight, setIsHoveringSpotlight] = useState(false);
  const [autoScrollStopped, setAutoScrollStopped] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(280);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Update card dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const newCardWidth = getCardWidth(containerWidth);
      setCardWidth(newCardWidth);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Duplicate locations for infinite scroll effect
  const extendedLocations = useMemo(() => {
    if (locations.length === 0) return [];
    // Triple the array for seamless looping
    return [...locations, ...locations, ...locations];
  }, [locations]);

  // Calculate which card is closest to the center of the viewport
  const updateSpotlight = useCallback(() => {
    if (!scrollRef.current || locations.length === 0) return;

    const scrollEl = scrollRef.current;
    const containerRect = scrollEl.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    // Find which card is closest to the center
    let closestIndex = 0;
    let closestDistance = Infinity;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setSpotlightIndex(closestIndex);
  }, [locations.length]);

  // Handle infinite loop repositioning
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || locations.length === 0) return;

    const scrollEl = scrollRef.current;
    const scrollLeft = scrollEl.scrollLeft;

    // Calculate the width of one full set of locations
    const oneSetWidth = locations.length * (cardWidth + GAP);

    // If we've scrolled past the second set, jump back to the first set
    if (scrollLeft >= oneSetWidth * 2) {
      scrollEl.scrollLeft = scrollLeft - oneSetWidth;
    }
    // If we've scrolled before the first set, jump to the second set
    else if (scrollLeft < oneSetWidth * 0.1) {
      scrollEl.scrollLeft = scrollLeft + oneSetWidth;
    }

    updateSpotlight();
  }, [locations.length, cardWidth, updateSpotlight]);

  // Initialize scroll position to the middle set, centered on first card
  useEffect(() => {
    if (!scrollRef.current || !containerRef.current || locations.length === 0) return;

    const oneSetWidth = locations.length * (cardWidth + GAP);
    const containerWidth = containerRef.current.offsetWidth;

    // Center the first card of the middle set
    // Offset to center: (containerWidth / 2) - (cardWidth / 2)
    const centerOffset = (containerWidth - cardWidth) / 2;
    scrollRef.current.scrollLeft = oneSetWidth - centerOffset;

    // Small delay to let the scroll position settle before updating spotlight
    setTimeout(updateSpotlight, 50);
  }, [locations.length, cardWidth, updateSpotlight]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    scrollEl.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateSpotlight);

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateSpotlight);
    };
  }, [handleScroll, updateSpotlight]);

  // Scroll handler that permanently stops auto-scroll
  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    setAutoScrollStopped(true); // Permanently stop auto-scroll
    const scrollAmount = cardWidth + GAP;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, [cardWidth]);

  // Auto-scroll functionality - stops when hovering spotlight or permanently stopped
  useEffect(() => {
    if (isHoveringSpotlight || autoScrollStopped || locations.length <= 1) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const interval = setInterval(() => {
      // Always scroll forward - infinite loop handles wrapping
      scrollEl.scrollBy({ left: cardWidth + GAP, behavior: "smooth" });
    }, AUTO_SCROLL_DELAY);

    return () => clearInterval(interval);
  }, [isHoveringSpotlight, autoScrollStopped, locations.length, cardWidth]);

  // Handlers for spotlight hover
  const handleSpotlightHover = useCallback((isHovering: boolean) => {
    setIsHoveringSpotlight(isHovering);
  }, []);

  if (locations.length === 0) return null;

  return (
    <section aria-label="Featured destinations">
      {/* Header - Augmented Fourth scale: 32px title, 16px subtitle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[32px] font-bold text-charcoal leading-tight">Featured Destinations</h2>
          <p className="text-[16px] text-stone mt-1">Discover Japan's most loved places</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground-secondary transition hover:border-charcoal hover:bg-sand shadow-sm"
            aria-label="Scroll left"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground-secondary transition hover:border-charcoal hover:bg-sand shadow-sm"
            aria-label="Scroll right"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel Container - Fixed height to prevent layout shifts */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: `${Math.ceil(cardWidth / CARD_ASPECT_RATIO * 1.55) + 20}px` }} // Card height + extra for 150% spotlight scale
      >
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-hide absolute inset-0 items-center"
          style={{ gap: `${GAP}px` }}
        >
          {extendedLocations.map((location, index) => (
            <FeaturedCard
              key={`${location.id}-${index}`}
              ref={(el) => { cardRefs.current[index] = el; }}
              location={location}
              onSelect={setSelectedLocation}
              isSpotlight={index === spotlightIndex}
              cardWidth={cardWidth}
              onHoverChange={index === spotlightIndex ? handleSpotlightHover : undefined}
            />
          ))}
        </div>
      </div>

      {/* Location Details Modal */}
      <LocationDetailsModal
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </section>
  );
}

type FeaturedCardProps = {
  location: Location;
  onSelect?: (location: Location) => void;
  isSpotlight?: boolean;
  cardWidth: number;
  onHoverChange?: (isHovering: boolean) => void;
};

const FeaturedCard = forwardRef<HTMLButtonElement, FeaturedCardProps>(
  function FeaturedCard({ location, onSelect, isSpotlight = false, cardWidth, onHoverChange }, ref) {
    const { details } = useLocationDetailsQuery(location.id);
    const displayName = getLocationDisplayName(details?.displayName ?? null, location);
    const imageSrc = location.primaryPhotoUrl ?? location.image;
    const rating = location.rating ?? 0;
    const description = location.description || details?.editorialSummary || "";

    // All cards have same base dimensions for consistent scrolling
    // Spotlight effect is achieved via CSS transform scale
    const baseHeight = cardWidth / CARD_ASPECT_RATIO; // 16:9 aspect ratio (wider)

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect?.(location)}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        style={{
          width: `${cardWidth}px`,
          minWidth: `${cardWidth}px`,
          height: `${baseHeight}px`
        }}
        className={`
          flex-none rounded-2xl overflow-hidden relative group
          text-left cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal
          transition-all duration-500 ease-out
          ${isSpotlight
            ? "scale-150 z-10 shadow-2xl ring-2 ring-white/30 hover:ring-white/50"
            : "scale-[0.7] opacity-40 hover:opacity-60"
          }
        `}
      >
        {/* Background Image */}
        <div className="absolute inset-0 bg-charcoal">
          <Image
            src={imageSrc || FALLBACK_IMAGE}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={`${cardWidth}px`}
          />
        </div>

        {/* Gradient Overlay - stronger for description readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Rating Badge - Glass-morphism */}
        {rating > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-lg">
            <StarIcon />
            <span className="text-sm font-semibold text-charcoal">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Content - Text on Image */}
        {/* Typography: Augmented Fourth scale (1.414 ratio), base 16px */}
        {/* Scale: 8px, 11px, 16px, 23px, 32px, 45px */}
        <div className={`absolute inset-x-0 bottom-0 ${isSpotlight ? "p-3" : "p-2"}`}>
          <h3
            className={`
              font-semibold text-white line-clamp-1
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]
              transition-all duration-500
              ${isSpotlight ? "text-[16px] leading-tight" : "text-[11px]"}
            `}
          >
            {displayName}
          </h3>
          <p
            className={`
              text-white/80 line-clamp-1 mt-0.5
              drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]
              transition-all duration-500
              ${isSpotlight ? "text-[11px]" : "text-[8px] opacity-80"}
            `}
          >
            {location.city}, {location.region}
          </p>
          {/* Description - only show for spotlight card */}
          {isSpotlight && description && (
            <p
              className="
                text-white/70 text-[11px] leading-snug line-clamp-3 mt-1.5
                drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]
                transition-all duration-500
              "
            >
              {description}
            </p>
          )}
        </div>
      </button>
    );
  }
);

const FALLBACK_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-amber-500"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}
