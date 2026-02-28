"use client";

import { useState, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { deriveRegionsFromCities } from "@/data/regions";
import { vibesToInterests } from "@/data/vibes";
import type { TripBuilderData, CityId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import type { VibeId } from "@/data/vibes";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const QUICK_PRESETS = [
  { id: "tokyo", label: "Tokyo", cities: ["tokyo"] },
  { id: "kyoto-osaka", label: "Kyoto & Osaka", cities: ["kyoto", "osaka"] },
  {
    id: "tokyo-kyoto",
    label: "Tokyo + Kyoto",
    cities: ["tokyo", "kyoto", "osaka"],
  },
  { id: "hokkaido", label: "Hokkaido", cities: ["sapporo", "hakodate"] },
  { id: "kyushu", label: "Kyushu", cities: ["fukuoka", "nagasaki"] },
] as const;

const DURATION_OPTIONS = [3, 5, 7, 10] as const;

type IntroStepBProps = {
  onStart: () => void;
  onQuickStart?: (data: Partial<TripBuilderData>) => void;
  sanityConfig?: TripBuilderConfig;
};

export function IntroStepB({
  onStart,
  onQuickStart,
  sanityConfig,
}: IntroStepBProps) {
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

    onQuickStart({
      duration: quickDuration,
      dates: { start: fmt(start), end: fmt(end) },
      vibes,
      interests,
      regions,
      cities,
      style: "balanced",
    });
  }, [onQuickStart, quickPreset, quickDuration]);

  const heading =
    sanityConfig?.introHeading ?? "Plan your perfect Japan trip";
  const description =
    sanityConfig?.introDescription ??
    "Share what moves you, and we\u2019ll build a day-by-day itinerary from places locals actually go.";
  const ctaText = sanityConfig?.introCtaText ?? "Start Planning";

  const fadeUp = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.6, ease: bEase, delay },
        };

  return (
    <div className="relative -mt-20 flex min-h-[100dvh] items-center bg-white pt-20">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]"
            {...fadeUp(0.1)}
          >
            Trip Builder
          </motion.p>

          <motion.h1
            className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-[-0.04em] text-[var(--foreground)]"
            {...fadeUp(0.2)}
          >
            {heading}
          </motion.h1>

          <motion.p
            className="mt-5 text-lg leading-relaxed text-[var(--foreground-body)]"
            {...fadeUp(0.3)}
          >
            {description}
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            {...fadeUp(0.4)}
          >
            <button
              type="button"
              onClick={onStart}
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-sm font-medium text-white shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-elevated)] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 sm:w-auto"
            >
              {ctaText}
            </button>

            {onQuickStart && (
              <button
                type="button"
                onClick={() => setShowQuickPlan((v) => !v)}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] px-8 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 sm:w-auto"
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
                  transition={{ duration: 0.3, ease: bEase }}
                  className="mt-6 overflow-hidden"
                >
                  <div
                    className="mx-auto max-w-sm space-y-4 rounded-2xl bg-white p-5 text-left"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        Pick a duration and destination
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowQuickPlan(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
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
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        Duration
                      </p>
                      <div className="flex gap-2">
                        {DURATION_OPTIONS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setQuickDuration(d)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
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
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        Destination
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setQuickPreset(p.id)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
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
                      className="h-11 w-full rounded-xl bg-[var(--primary)] text-sm font-medium text-white transition-all hover:shadow-[var(--shadow-elevated)] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
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
