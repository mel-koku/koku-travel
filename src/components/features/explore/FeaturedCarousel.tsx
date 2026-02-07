"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo, forwardRef } from "react";
import type { Location } from "@/types/location";

const LocationDetailsModal = dynamic(
  () => import("./LocationDetailsModal").then((m) => ({ default: m.LocationDetailsModal })),
  { ssr: false }
);

type FeaturedCarouselProps = {
  locations: Location[];
  totalLocations?: number;
};

const AUTO_SCROLL_DELAY = 4000; // 4 seconds for better viewing
const GAP = 8; // Gap between cards (appears larger due to non-spotlight scale)
const CARD_ASPECT_RATIO = 16 / 9; // Horizontal 16:9 aspect ratio for all cards
const SPOTLIGHT_SCALE = 1.7; // Larger spotlight for hero treatment

// Always show 3 columns for true center spotlight
const VISIBLE_CARDS = 3;

function getCardWidth(containerWidth: number): number {
  // Calculate card width based on container width, gap, and 3 visible cards
  const totalGap = GAP * (VISIBLE_CARDS - 1);
  return Math.floor((containerWidth - totalGap) / VISIBLE_CARDS);
}

export function FeaturedCarousel({ locations, totalLocations }: FeaturedCarouselProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHoveringSpotlight, setIsHoveringSpotlight] = useState(false);
  const [autoScrollStopped, setAutoScrollStopped] = useState(false);
  // Initialize spotlight to first card of middle set (locations are tripled for infinite scroll)
  const [spotlightIndex, setSpotlightIndex] = useState(() => locations.length);
  const [cardWidth, setCardWidth] = useState(280);
  const [isMounted, setIsMounted] = useState(false);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Auto-play progress tracking
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track page scroll to hide scroll indicator
  const [hasScrolledDown, setHasScrolledDown] = useState(false);

  // Track client-side mount to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Hide scroll indicator once user scrolls down
  useEffect(() => {
    const handlePageScroll = () => {
      if (window.scrollY > 100) {
        setHasScrolledDown(true);
      }
    };
    window.addEventListener("scroll", handlePageScroll);
    return () => window.removeEventListener("scroll", handlePageScroll);
  }, []);

  // Update card dimensions on resize
  // useLayoutEffect for initial measurement to prevent layout flash
  useLayoutEffect(() => {
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
  // useLayoutEffect runs synchronously before paint, preventing flash of unpositioned content
  useLayoutEffect(() => {
    if (!scrollRef.current || !containerRef.current || locations.length === 0) return;

    const oneSetWidth = locations.length * (cardWidth + GAP);
    const containerWidth = containerRef.current.offsetWidth;

    // Center the first card of the middle set
    // Offset to center: (containerWidth / 2) - (cardWidth / 2)
    const centerOffset = (containerWidth - cardWidth) / 2;
    scrollRef.current.scrollLeft = oneSetWidth - centerOffset;

    // Mark as ready after scroll position is set
    setIsScrollReady(true);
  }, [locations.length, cardWidth]);

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
    setAutoPlayProgress(0);
    const scrollAmount = cardWidth + GAP;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, [cardWidth]);

  // Auto-play progress indicator
  useEffect(() => {
    if (isHoveringSpotlight || autoScrollStopped || locations.length <= 1) {
      setAutoPlayProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // Update progress every 50ms for smooth animation
    const progressStep = 50 / AUTO_SCROLL_DELAY * 100;
    progressIntervalRef.current = setInterval(() => {
      setAutoPlayProgress(prev => {
        if (prev >= 100) return 0;
        return prev + progressStep;
      });
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isHoveringSpotlight, autoScrollStopped, locations.length]);

  // Auto-scroll functionality - stops when hovering spotlight or permanently stopped
  useEffect(() => {
    if (isHoveringSpotlight || autoScrollStopped || locations.length <= 1) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const interval = setInterval(() => {
      // Always scroll forward - infinite loop handles wrapping
      scrollEl.scrollBy({ left: cardWidth + GAP, behavior: "smooth" });
      setAutoPlayProgress(0);
    }, AUTO_SCROLL_DELAY);

    return () => clearInterval(interval);
  }, [isHoveringSpotlight, autoScrollStopped, locations.length, cardWidth]);

  // Handlers for spotlight hover
  const handleSpotlightHover = useCallback((isHovering: boolean) => {
    setIsHoveringSpotlight(isHovering);
  }, []);

  if (locations.length === 0) return null;

  // Calculate container height based on spotlight scale
  const baseCardHeight = cardWidth / CARD_ASPECT_RATIO;
  const containerHeight = Math.ceil(baseCardHeight * SPOTLIGHT_SCALE) + 40;

  return (
    <section aria-label="Featured destinations">
      {/* Hero Header - Serif typography with tagline */}
      <div className="text-center mb-5">
        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] text-brand-primary mb-1 block">
          Local&apos;s Choice
        </span>
        <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl text-charcoal leading-tight mb-1.5">
          Featured Destinations
        </h1>
        <p className="text-xs sm:text-sm text-stone max-w-lg mx-auto">
          Handpicked from {totalLocations?.toLocaleString() ?? "hundreds of"} places across Japan
        </p>
      </div>

      {/* Navigation Arrows - Desktop */}
      <div className="hidden sm:flex justify-center gap-3 mb-4">
        <button
          onClick={() => scroll("left")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground-secondary transition-all hover:border-charcoal hover:bg-sand hover:scale-105 active:scale-95 shadow-sm"
          aria-label="Previous destination"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => scroll("right")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground-secondary transition-all hover:border-charcoal hover:bg-sand hover:scale-105 active:scale-95 shadow-sm"
          aria-label="Next destination"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Carousel Container - Fixed height to prevent layout shifts */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: `${containerHeight}px` }}
      >
        {/* Static preview - shows until carousel is ready (SSR-safe, no hydration mismatch) */}
        {locations[0] && (
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-out"
            style={{
              opacity: isScrollReady ? 0 : 1,
              pointerEvents: isScrollReady ? 'none' : 'auto',
            }}
          >
            <FeaturedCard
              location={locations[0]}
              onSelect={setSelectedLocation}
              isSpotlight={true}
              cardWidth={cardWidth}
              isReady={true}
            />
          </div>
        )}
        {/* Full scrolling carousel - only render on client after mount */}
        {isMounted && (
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-hide absolute inset-0 items-center transition-opacity duration-500 ease-out"
            style={{
              gap: `${GAP}px`,
              opacity: isScrollReady ? 1 : 0,
              pointerEvents: isScrollReady ? 'auto' : 'none',
            }}
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
                isReady={isScrollReady}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress Dots with Auto-play Indicator */}
      {isMounted && isScrollReady && locations.length > 1 && (
        <div className="flex flex-col items-center gap-3 mt-6">
          {/* Auto-play progress bar */}
          {!autoScrollStopped && (
            <div className="w-32 h-1 bg-sand/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary/60 transition-all duration-75 ease-linear"
                style={{ width: `${autoPlayProgress}%` }}
              />
            </div>
          )}

          {/* Navigation dots */}
          <div className="flex justify-center gap-2">
            {locations.map((location, index) => {
              // Calculate which original location is currently in spotlight
              const currentIndex = spotlightIndex % locations.length;
              const isActive = index === currentIndex;
              return (
                <button
                  key={location.id}
                  onClick={() => {
                    if (!scrollRef.current || !containerRef.current) return;
                    setAutoScrollStopped(true);
                    setAutoPlayProgress(0);
                    const oneSetWidth = locations.length * (cardWidth + GAP);
                    const containerWidth = containerRef.current.offsetWidth;
                    const centerOffset = (containerWidth - cardWidth) / 2;
                    // Scroll to the corresponding card in the middle set
                    const targetScroll = oneSetWidth + index * (cardWidth + GAP) - centerOffset;
                    scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
                  }}
                  className={`rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-8 h-2.5 bg-brand-primary"
                      : "w-2.5 h-2.5 bg-stone/30 hover:bg-stone/50"
                  }`}
                  aria-label={`Go to ${location.name}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Swipe Hint */}
      <div className="sm:hidden flex justify-center mt-3">
        <p className="text-[10px] text-stone flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Swipe to explore
        </p>
      </div>

      {/* Scroll Down Indicator - Fixed to lower right, hides after scrolling */}
      {!hasScrolledDown && (
        <div className="fixed bottom-8 right-10 sm:bottom-12 sm:right-16 z-50 transition-opacity duration-500">
          <div className="flex flex-col items-center gap-1.5 text-stone animate-bounce">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap">Scroll</span>
            <div className="h-6 w-px bg-gradient-to-b from-stone/60 to-transparent" />
          </div>
        </div>
      )}

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
  isReady?: boolean;
};

const FeaturedCard = forwardRef<HTMLButtonElement, FeaturedCardProps>(
  function FeaturedCard({ location, onSelect, isSpotlight = false, cardWidth, onHoverChange, isReady = false }, ref) {
    // Use location data directly - no need to fetch details just for card display
    const displayName = location.name;
    const imageSrc = location.primaryPhotoUrl ?? location.image;
    const rating = location.rating ?? 0;
    const description = location.description || location.shortDescription || "";

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
          ${!isReady
            ? "scale-[1.7] z-10 shadow-depth ring-2 ring-white/40"
            : isSpotlight
              ? "scale-[1.7] z-10 shadow-depth ring-2 ring-white/40 hover:ring-white/60"
              : "scale-[0.7] opacity-50 grayscale-[40%] hover:opacity-70 hover:grayscale-[20%]"
          }
        `}
      >
        {/* Background Image */}
        <div className="absolute inset-0 bg-charcoal">
          <Image
            src={imageSrc || FALLBACK_IMAGE}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={`${cardWidth}px`}
            priority={isSpotlight}
          />
        </div>

        {/* Gradient Overlay - stronger for spotlight readability */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${
          isSpotlight
            ? "bg-gradient-to-t from-black/90 via-black/30 to-black/10"
            : "bg-gradient-to-t from-black/80 via-black/30 to-transparent"
        }`} />

        {/* Rating Badge - Glass-morphism */}
        {rating > 0 && (
          <div className={`absolute top-2 left-2 flex items-center gap-0.5 h-5 bg-white/95 backdrop-blur-sm px-1.5 rounded-md shadow-lg transition-all duration-500 ${
            isSpotlight ? "opacity-100" : "opacity-0"
          }`}>
            <StarIcon />
            <span className="text-[10px] font-semibold text-charcoal">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Category Badge - Spotlight only */}
        {isSpotlight && isReady && (
          <div className="absolute top-2 right-2 flex items-center h-5 bg-brand-primary/90 backdrop-blur-sm px-1.5 rounded-md shadow-lg">
            <span className="text-[10px] font-medium text-white capitalize">{location.category}</span>
          </div>
        )}

        {/* Content - Compact for spotlight */}
        <div className={`absolute inset-x-0 bottom-0 transition-all duration-500 ${
          !isReady || isSpotlight ? "p-2.5 sm:p-3" : "p-1.5"
        }`}>
          <h3
            className={`
              font-semibold text-white
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]
              transition-all duration-500
              ${!isReady || isSpotlight
                ? "text-xs sm:text-sm leading-tight line-clamp-1"
                : "text-[9px] line-clamp-1"
              }
            `}
          >
            {displayName}
          </h3>

          <p
            className={`
              text-white/80 mt-0.5
              drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]
              transition-all duration-500
              ${!isReady || isSpotlight ? "text-[10px] sm:text-xs" : "text-[7px] opacity-70"}
            `}
          >
            {location.city}, {location.region}
          </p>

          {/* Description - only show for spotlight card */}
          {isReady && isSpotlight && description && (
            <p
              className="
                text-white/70 text-[10px] sm:text-xs leading-snug line-clamp-2 mt-1
                drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]
                hidden sm:block
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
      className="h-2.5 w-2.5 text-semantic-warning"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}
