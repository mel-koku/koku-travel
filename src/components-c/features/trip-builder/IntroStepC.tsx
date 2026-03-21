"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { deriveRegionsFromCities } from "@/data/regions";
import { vibesToInterests } from "@/data/vibes";
import { cEase } from "@c/ui/motionC";
import { urlFor } from "@/sanity/image";
import type { TripBuilderData, CityId, EntryPoint } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import type { VibeId } from "@/data/vibes";

const QUICK_ENTRY_POINTS: Record<string, EntryPoint> = {
  NRT: { type: "airport", id: "nrt", name: "Narita International Airport", iataCode: "NRT", cityId: "tokyo", coordinates: { lat: 35.7647, lng: 140.3864 }, region: "kanto" },
  KIX: { type: "airport", id: "kix", name: "Kansai International Airport", iataCode: "KIX", cityId: "osaka", coordinates: { lat: 34.4347, lng: 135.2441 }, region: "kansai" },
  CTS: { type: "airport", id: "cts", name: "New Chitose Airport", iataCode: "CTS", cityId: "sapporo", coordinates: { lat: 42.7752, lng: 141.6925 }, region: "hokkaido" },
  FUK: { type: "airport", id: "fuk", name: "Fukuoka Airport", iataCode: "FUK", cityId: "fukuoka", coordinates: { lat: 33.5859, lng: 130.4510 }, region: "kyushu" },
};

const QUICK_PRESETS = [
  { id: "tokyo", label: "Tokyo", cities: ["tokyo"], airport: "NRT" },
  { id: "kyoto-osaka", label: "Kyoto & Osaka", cities: ["kyoto", "osaka"], airport: "KIX" },
  { id: "tokyo-kyoto", label: "Tokyo + Kyoto", cities: ["tokyo", "kyoto", "osaka"], airport: "NRT" },
  { id: "hokkaido", label: "Hokkaido", cities: ["sapporo", "hakodate"], airport: "CTS" },
  { id: "kyushu", label: "Kyushu", cities: ["fukuoka", "nagasaki"], airport: "FUK" },
] as const;

const DURATION_OPTIONS = [3, 5, 7, 10] as const;

type IntroStepCProps = {
  onStart: () => void;
  onQuickStart?: (data: Partial<TripBuilderData>) => void;
  sanityConfig?: TripBuilderConfig;
};

export function IntroStepC({
  onStart,
  onQuickStart,
  sanityConfig,
}: IntroStepCProps) {
  const prefersReducedMotion = useReducedMotion();
  const [showQuickPlan, setShowQuickPlan] = useState(false);
  const [quickDuration, setQuickDuration] = useState<number>(5);
  const [quickPreset, setQuickPreset] = useState("tokyo-kyoto");

  const handleQuickStart = useCallback(() => {
    if (!onQuickStart) return;
    const preset =
      QUICK_PRESETS.find((p) => p.id === quickPreset) ?? QUICK_PRESETS[2];
    const cities = preset.cities as unknown as CityId[];
    const regions = deriveRegionsFromCities(cities);
    const vibes: VibeId[] = ["temples_tradition", "foodie_paradise"];
    const interests = vibesToInterests(vibes);

    const start = new Date();
    start.setDate(start.getDate() + 14);
    const end = new Date(start);
    end.setDate(end.getDate() + quickDuration - 1);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const entryPoint = QUICK_ENTRY_POINTS[preset.airport];

    onQuickStart({
      duration: quickDuration,
      dates: { start: fmt(start), end: fmt(end) },
      vibes,
      interests,
      regions,
      cities,
      style: "balanced",
      entryPoint,
      sameAsEntry: true,
    });
  }, [onQuickStart, quickPreset, quickDuration]);

  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const dotY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  const heading =
    sanityConfig?.introHeading ?? "Your Japan";
  const description =
    sanityConfig?.introDescription ??
    "Tell us what you\u2019re into. We\u2019ll build the trip, day by day, from places we\u2019d actually recommend.";
  const ctaText = sanityConfig?.introCtaText ?? "Start Planning";

  const heroImageUrl = sanityConfig?.introAccentImage
    ? (sanityConfig.introAccentImage.url ?? urlFor(sanityConfig.introAccentImage).width(1200).quality(80).url())
    : "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80";

  const fadeUp = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.5, ease: cEase, delay },
        };

  return (
    <div ref={sectionRef} className="relative -mt-20 flex min-h-[100dvh] items-center bg-[var(--background)] pt-20 overflow-hidden">
      {/* Dot grid background - right side */}
      <motion.div
        className="pointer-events-none absolute hidden lg:block"
        style={{
          top: "15%",
          right: "8%",
          width: 200,
          height: 280,
          opacity: 0.06,
          y: prefersReducedMotion ? undefined : dotY,
        }}
      >
        <svg width="200" height="280" viewBox="0 0 200 280" fill="none">
          {Array.from({ length: 14 }).map((_, row) =>
            Array.from({ length: 10 }).map((_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={col * 20 + 10}
                cy={row * 20 + 10}
                r="1.5"
                fill="currentColor"
              />
            ))
          )}
        </svg>
      </motion.div>

      {/* Contained hero image - right side */}
      <motion.div
        className="absolute hidden lg:block"
        style={{
          top: "8%",
          right: "6%",
          width: "45%",
          height: "78%",
          y: prefersReducedMotion ? undefined : imageY,
        }}
        initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 1.04 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: cEase }}
      >
        {/* Vermillion accent line */}
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: "var(--primary)" }}
        />
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src={heroImageUrl}
            alt="Japan travel"
            fill
            className="object-cover"
            sizes="45vw"
            priority
          />
        </div>
      </motion.div>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-24 sm:py-32 lg:px-10 lg:py-40">
        {/* Left-aligned layout for C */}
        <div className="max-w-lg lg:max-w-xl">
          <motion.p
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
            {...fadeUp(0.1)}
          >
            Trip Builder
          </motion.p>

          <motion.h1
            className="mt-5 text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
            {...fadeUp(0.2)}
          >
            {heading}
          </motion.h1>

          <motion.p
            className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)]"
            {...fadeUp(0.3)}
          >
            {description}
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:gap-4"
            {...fadeUp(0.4)}
          >
            <button
              type="button"
              onClick={onStart}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center bg-[var(--primary)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 sm:w-auto"
            >
              {ctaText}
            </button>

            {onQuickStart && (
              <button
                type="button"
                onClick={() => setShowQuickPlan((v) => !v)}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center border border-[var(--border)] bg-[var(--background)] px-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--foreground)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 sm:w-auto"
              >
                Quick Plan
              </button>
            )}
          </motion.div>

          {onQuickStart && (
            <AnimatePresence>
              {showQuickPlan && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: cEase }}
                  className="mt-8 overflow-hidden"
                >
                  <div className="max-w-sm space-y-5 border border-[var(--border)] bg-[var(--background)] p-5 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Pick a duration and destination
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowQuickPlan(false)}
                        className="flex h-7 w-7 items-center justify-center text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                        aria-label="Close quick plan"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M1 1l12 12M13 1L1 13" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                        Duration
                      </p>
                      <div className="flex gap-2">
                        {DURATION_OPTIONS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setQuickDuration(d)}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                              d === quickDuration
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                        Destination
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setQuickPreset(p.id)}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                              p.id === quickPreset
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleQuickStart}
                      className="h-11 w-full bg-[var(--primary)] text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                    >
                      Go
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
