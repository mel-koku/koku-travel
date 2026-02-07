"use client";

import {
  motion,
  motionValue,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { Magnetic } from "@/components/ui/Magnetic";
import { useCursor } from "@/hooks/useCursor";
import { ExploreHeroSlide } from "./ExploreHeroSlide";
import { LocationExpanded } from "./LocationExpanded";
import type { Location } from "@/types/location";

type ExploreHeroProps = {
  locations: Location[];
  totalLocations?: number;
  /** Called when hero section is scrolled past, so parent can show filters/header */
  onHeroComplete?: (isPastHero: boolean) => void;
};

const HERO_LOCATIONS = 5;
const MOBILE_CROSSFADE_MS = 4000;

// ──────────────────────────────────────────────
// ScrollSlide — isolates useTransform hooks per slide
// ──────────────────────────────────────────────
type ScrollSlideProps = {
  location: Location;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  fadeIn: number;
  fadeOut: number;
  segStart: number;
  segEnd: number;
  scrollYProgress: MotionValue<number>;
  isActive: boolean;
  showText: boolean;
};

function ScrollSlide({
  location,
  index,
  isFirst,
  isLast,
  fadeIn,
  fadeOut,
  segStart,
  segEnd,
  scrollYProgress,
  isActive,
  showText,
}: ScrollSlideProps) {
  const opacity = useTransform(
    scrollYProgress,
    isFirst
      ? [0, fadeIn, fadeOut - 0.02, fadeOut]
      : [fadeIn - 0.02, fadeIn, fadeOut - 0.02, fadeOut],
    isFirst ? [1, 1, 1, 0] : [0, 1, 1, isLast ? 1 : 0]
  );

  const scale = useTransform(
    scrollYProgress,
    [segStart, segEnd],
    [1, 1.06]
  );

  return (
    <ExploreHeroSlide
      location={location}
      opacity={opacity}
      scale={scale}
      isActive={isActive}
      index={index}
      showText={showText}
    />
  );
}

// ──────────────────────────────────────────────
// Main ExploreHero component
// ──────────────────────────────────────────────
export function ExploreHero({
  locations,
  totalLocations,
  onHeroComplete,
}: ExploreHeroProps) {
  const heroLocations = useMemo(
    () => locations.slice(0, HERO_LOCATIONS),
    [locations]
  );
  const count = heroLocations.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { setCursorState } = useCursor();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showLocationText, setShowLocationText] = useState(false);

  // Detect mobile breakpoint
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // ──────────────────────────────────────────────
  // Scroll-driven animation (desktop only)
  // ──────────────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Track active index + notify parent when hero is done
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (isMobile || prefersReducedMotion) return;

    // Location segments: 0.10–0.90
    const locationProgress = Math.max(0, Math.min(1, (v - 0.10) / 0.80));
    const idx = Math.min(count - 1, Math.floor(locationProgress * count));
    setActiveIndex(idx);

    // Show location text after headline has faded
    setShowLocationText(v > 0.08);

    // Notify parent when hero is scrolled past
    onHeroComplete?.(v > 0.92);
  });

  // Per-slide scroll segments (locations occupy 0.10–0.90 of the scroll)
  const slideSegments = useMemo(() => {
    return heroLocations.map((_, i) => {
      const segStart = 0.10 + (i / count) * 0.80;
      const segEnd = 0.10 + ((i + 1) / count) * 0.80;
      return { fadeIn: segStart, fadeOut: segEnd, segStart, segEnd };
    });
  }, [heroLocations, count]);

  // Headline: visible immediately, fades out as first location appears
  const headlineOpacity = useTransform(
    scrollYProgress,
    [0, 0.005, 0.06, 0.10],
    [1, 1, 1, 0]
  );
  const headlineY = useTransform(
    scrollYProgress,
    [0.06, 0.10],
    ["0%", "-12%"]
  );

  // "Explore All" button: visible during hero, fades out at end
  const exploreButtonOpacity = useTransform(
    scrollYProgress,
    [0, 0.02, 0.85, 0.90],
    [0, 1, 1, 0]
  );

  // Hero exit fade
  const heroExitOpacity = useTransform(scrollYProgress, [0.90, 1], [1, 0]);
  const heroExitScale = useTransform(scrollYProgress, [0.90, 1], [1, 0.97]);

  // Progress line width
  const progressWidth = useTransform(
    scrollYProgress,
    [0.10, 0.90],
    ["0%", "100%"]
  );

  // Scroll indicator opacity
  const scrollIndicatorOpacity = useTransform(
    scrollYProgress,
    [0, 0.06],
    [1, 0]
  );

  // ──────────────────────────────────────────────
  // Mobile: auto-crossfade timer
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!isMobile || prefersReducedMotion || count <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, MOBILE_CROSSFADE_MS);
    return () => clearInterval(interval);
  }, [isMobile, prefersReducedMotion, count]);

  // Static motion values for mobile (no scroll-driven animation)
  const staticOpacity = useMemo(() => motionValue(1), []);
  const staticScale = useMemo(() => motionValue(1), []);

  // Click handler
  const handleSlideClick = useCallback(() => {
    if (heroLocations[activeIndex]) {
      setSelectedLocation(heroLocations[activeIndex]);
    }
  }, [heroLocations, activeIndex]);

  // Skip to grid
  const scrollToGrid = useCallback(() => {
    if (!containerRef.current) return;
    const heroBottom =
      containerRef.current.offsetTop + containerRef.current.offsetHeight;
    window.scrollTo({ top: heroBottom, behavior: "smooth" });
  }, []);

  if (count === 0) return null;

  // ──────────────────────────────────────────────
  // Reduced motion: static first image
  // ──────────────────────────────────────────────
  if (prefersReducedMotion) {
    const loc = heroLocations[0]!;
    const imgSrc = loc.primaryPhotoUrl ?? loc.image;
    return (
      <section className="relative h-screen w-full overflow-hidden bg-charcoal">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={loc.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/40 to-charcoal/20" />
        </div>
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.25em] text-white/60">
            {(totalLocations ?? locations.length).toLocaleString()}+ curated
            places
          </p>
          <h1 className="font-serif text-[clamp(3rem,12vw,7rem)] font-medium leading-[0.9] tracking-tight text-white">
            EXPLORE
          </h1>
          <button
            onClick={scrollToGrid}
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Explore All Locations
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        </div>
        <AnimatePresence>
          {selectedLocation && (
            <LocationExpanded
              location={selectedLocation}
              onClose={() => setSelectedLocation(null)}
            />
          )}
        </AnimatePresence>
      </section>
    );
  }

  // Counter display
  const counterCurrent = String(activeIndex + 1).padStart(2, "0");
  const counterTotal = String(count).padStart(2, "0");

  return (
    <>
      <section
        ref={containerRef}
        className={isMobile ? "relative h-screen w-full" : "relative w-full"}
        style={isMobile ? undefined : { height: "600vh" }}
      >
        {/* Sticky viewport */}
        <motion.div
          className="sticky top-0 h-screen w-full overflow-hidden bg-charcoal"
          style={
            isMobile
              ? undefined
              : { opacity: heroExitOpacity, scale: heroExitScale }
          }
        >
          {/* Cursor interaction area */}
          <div
            className="absolute inset-0 z-20 cursor-pointer"
            onClick={handleSlideClick}
            onMouseEnter={() => setCursorState("view")}
            onMouseLeave={() => setCursorState("default")}
            role="button"
            tabIndex={0}
            aria-label={`View ${heroLocations[activeIndex]?.name ?? "location"} details`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSlideClick();
              }
            }}
          />

          {/* ── Slide layers ── */}
          {heroLocations.map((location, i) => {
            // Mobile: CSS transition + static motion values
            if (isMobile) {
              return (
                <div
                  key={location.id}
                  className="absolute inset-0 transition-opacity duration-1000"
                  style={{ opacity: i === activeIndex ? 1 : 0 }}
                >
                  <ExploreHeroSlide
                    location={location}
                    opacity={staticOpacity}
                    scale={staticScale}
                    isActive={i === activeIndex}
                    index={i}
                  />
                </div>
              );
            }
            // Desktop: scroll-driven via ScrollSlide sub-component
            const seg = slideSegments[i]!;
            return (
              <ScrollSlide
                key={location.id}
                location={location}
                index={i}
                isFirst={i === 0}
                isLast={i === count - 1}
                fadeIn={seg.fadeIn}
                fadeOut={seg.fadeOut}
                segStart={seg.segStart}
                segEnd={seg.segEnd}
                scrollYProgress={scrollYProgress}
                isActive={i === activeIndex}
                showText={showLocationText}
              />
            );
          })}

          {/* ── Film grain overlay ── */}
          <div
            className="pointer-events-none absolute inset-0 z-30 opacity-[0.035]"
            aria-hidden
          >
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <filter id="grain">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.65"
                  numOctaves="3"
                  stitchTiles="stitch"
                />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect
                width="100%"
                height="100%"
                filter="url(#grain)"
                opacity="1"
              />
            </svg>
          </div>

          {/* ── "EXPLORE" display headline (visible immediately, fades on scroll) ── */}
          {!isMobile && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center"
              style={{ opacity: headlineOpacity, y: headlineY }}
            >
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-6 text-sm font-medium uppercase tracking-[0.25em] text-white/50"
              >
                {(totalLocations ?? locations.length).toLocaleString()}+ curated
                places
              </motion.p>
              <SplitText
                as="h1"
                className="justify-center font-serif text-[clamp(3rem,12vw,7rem)] font-medium leading-[0.9] tracking-tight text-white"
                splitBy="char"
                trigger="load"
                animation="clipY"
                staggerDelay={0.04}
                delay={0.3}
              >
                EXPLORE
              </SplitText>
            </motion.div>
          )}

          {/* ── Mobile headline (always visible, centered) ── */}
          {isMobile && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-white/50">
                {(totalLocations ?? locations.length).toLocaleString()}+ curated
                places
              </p>
              <SplitText
                as="h1"
                className="justify-center font-serif text-[clamp(2.5rem,10vw,4rem)] font-medium leading-[0.9] tracking-tight text-white"
                splitBy="char"
                trigger="load"
                animation="clipY"
                staggerDelay={0.03}
                delay={0.2}
              >
                EXPLORE
              </SplitText>
            </div>
          )}

          {/* ── "Explore All Locations" button ── */}
          {!isMobile && (
            <motion.div
              className="absolute bottom-10 left-1/2 z-40 -translate-x-1/2"
              style={{ opacity: exploreButtonOpacity }}
            >
              <Magnetic>
                <button
                  onClick={scrollToGrid}
                  className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-7 py-3 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40"
                >
                  Explore All Locations
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              </Magnetic>
            </motion.div>
          )}

          {/* ── Progress counter (bottom-right) ── */}
          <div className="absolute bottom-8 right-6 z-30 sm:bottom-10 sm:right-10 lg:bottom-12 lg:right-16">
            <div className="flex items-baseline gap-1.5 font-mono text-white/40">
              <motion.span
                key={counterCurrent}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-medium text-white/70"
              >
                {counterCurrent}
              </motion.span>
              <span className="text-xs">/</span>
              <span className="text-xs">{counterTotal}</span>
            </div>
          </div>

          {/* ── Thin progress line (bottom edge) ── */}
          {!isMobile && (
            <div className="absolute bottom-0 left-0 right-0 z-30 h-[2px] bg-white/10">
              <motion.div
                className="h-full bg-white/30"
                style={{ width: progressWidth }}
              />
            </div>
          )}

          {/* ── Mobile progress dots ── */}
          {isMobile && count > 1 && (
            <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">
              {heroLocations.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-6 bg-white/70"
                      : "w-1.5 bg-white/30"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* ── Scroll indicator (desktop, visible before scrolling) ── */}
          {!isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2"
              style={{ opacity: scrollIndicatorOpacity }}
            >
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Scroll
                </span>
                <div className="relative h-16 w-px overflow-hidden">
                  <motion.div
                    animate={{ y: [0, 64, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute h-4 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Location expanded card */}
      <AnimatePresence>
        {selectedLocation && (
          <LocationExpanded
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
