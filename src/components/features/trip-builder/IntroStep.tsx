"use client";

import { useState, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { SplitText } from "@/components/ui/SplitText";
import { IntroImagePanel } from "@/components/features/trip-builder/IntroImagePanel";
import { easeReveal, staggerChar, durationBase } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { deriveRegionsFromCities } from "@/data/regions";
import { vibesToInterests } from "@/data/vibes";
import type { TripBuilderData, CityId } from "@/types/trip";
import type { TripBuilderConfig } from "@/types/sanitySiteContent";
import type { VibeId } from "@/data/vibes";

const QUICK_PRESETS = [
  { id: "tokyo", label: "Tokyo", cities: ["tokyo"] },
  { id: "kyoto-osaka", label: "Kyoto & Osaka", cities: ["kyoto", "osaka"] },
  { id: "tokyo-kyoto", label: "Tokyo + Kyoto", cities: ["tokyo", "kyoto", "osaka"] },
  { id: "hokkaido", label: "Hokkaido", cities: ["sapporo", "hakodate"] },
  { id: "kyushu", label: "Kyushu", cities: ["fukuoka", "nagasaki"] },
] as const;

const DURATION_OPTIONS = [3, 5, 7, 10] as const;

type IntroStepProps = {
  onStart: () => void;
  onQuickStart?: (data: Partial<TripBuilderData>) => void;
  sanityConfig?: TripBuilderConfig;
};

export function IntroStep({ onStart, onQuickStart, sanityConfig }: IntroStepProps) {
  const prefersReducedMotion = useReducedMotion();
  const [showQuickPlan, setShowQuickPlan] = useState(false);
  const [quickDuration, setQuickDuration] = useState<number>(5);
  const [quickPreset, setQuickPreset] = useState("tokyo-kyoto");

  const handleQuickStart = useCallback(() => {
    if (!onQuickStart) return;
    const preset = QUICK_PRESETS.find((p) => p.id === quickPreset) ?? QUICK_PRESETS[2];
    const cities = preset.cities as unknown as CityId[];
    const regions = deriveRegionsFromCities(cities);
    const vibes: VibeId[] = ["cultural_heritage", "foodie_paradise"];
    const interests = vibesToInterests(vibes);

    // Start date 2 weeks from now
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

  const heading = sanityConfig?.introHeading ?? "Your Japan";
  const subheading = sanityConfig?.introSubheading ?? "starts here";
  const description =
    sanityConfig?.introDescription ??
    "Share what moves you, and we\u2019ll plan the rest \u2014 day by day, from places locals actually go.";
  const ctaText = sanityConfig?.introCtaText ?? "Start Planning";
  const eyebrow = sanityConfig?.introEyebrow ?? "TRIP BUILDER";
  const accentImage =
    sanityConfig?.introAccentImage?.url ?? "/images/regions/kansai-hero.jpg";
  const imageCaption = sanityConfig?.introImageCaption ?? "Kansai, Japan";

  const fade = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0.005, y: 12 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.4, ease: easeReveal, delay },
        };

  return (
    <div className="relative -mt-20 flex min-h-[100dvh] items-center overflow-hidden bg-background pt-20">

      {/* Main grid content */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_0.82fr] lg:gap-16 lg:px-10">
        {/* ── LEFT COLUMN — Typography + CTA ── */}
        <div className="flex flex-col justify-center">
          {/* Eyebrow */}
          <motion.p
            className="eyebrow-editorial"
            {...fade(0.15)}
          >
            {eyebrow}
          </motion.p>

          {/* Heading — lead-in */}
          <SplitText
            as="p"
            className="mt-4 font-serif text-[clamp(1.5rem,5vw,3.5rem)] italic leading-[1.1] text-foreground-secondary"
            splitBy="char"
            animation="fadeUp"
            staggerDelay={staggerChar}
            delay={0.05}
          >
            {heading}
          </SplitText>

          {/* Subheading — dramatic scale, brand-primary */}
          <SplitText
            as="h1"
            className="mt-2 font-serif italic text-[clamp(4rem,12vw,9rem)] leading-[0.9] text-brand-primary"
            splitBy="word"
            animation="clipY"
            staggerDelay={0.08}
            delay={0.25}
          >
            {subheading}
          </SplitText>

          {/* Description */}
          <motion.p
            className="mt-6 max-w-sm text-base leading-relaxed text-foreground-secondary sm:text-lg"
            {...fade(0.45)}
          >
            {description}
          </motion.p>

          {/* CTAs — Primary + Secondary */}
          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            initial={
              prefersReducedMotion ? {} : { opacity: 0.005, y: 12 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durationBase,
              ease: easeReveal,
              delay: 0.7,
            }}
          >
            {/* Primary: Start Planning */}
            <button
              type="button"
              onClick={onStart}
              className="h-14 w-full cursor-pointer rounded-xl bg-brand-primary px-10 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-brand-primary/90 hover:shadow-xl active:scale-[0.98] sm:w-auto"
            >
              {ctaText}
            </button>

            {/* Secondary: Quick Plan */}
            {onQuickStart && (
              <button
                type="button"
                onClick={() => setShowQuickPlan((v) => !v)}
                className="h-14 w-full cursor-pointer rounded-xl border border-border bg-transparent px-10 text-sm font-semibold uppercase tracking-wider text-foreground transition-all hover:border-foreground-secondary hover:bg-surface active:scale-[0.98] sm:w-auto"
              >
                Quick Plan
              </button>
            )}
          </motion.div>

          {/* Quick Plan — express mode (expanded) */}
          {onQuickStart && showQuickPlan && (
            <motion.div
              className="mt-6"
              {...fade(0.1)}
            >
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: easeReveal }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-border bg-surface p-5 max-w-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        Pick a duration and destination
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowQuickPlan(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background hover:text-foreground"
                        aria-label="Close quick plan"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13" /></svg>
                      </button>
                    </div>

                    {/* Duration buttons */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-stone uppercase tracking-wide">Duration</p>
                      <div className="flex gap-2">
                        {DURATION_OPTIONS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setQuickDuration(d)}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                              d === quickDuration
                                ? "bg-brand-primary text-white"
                                : "bg-background text-foreground-secondary hover:text-foreground"
                            )}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Destination preset chips */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-stone uppercase tracking-wide">Destination</p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setQuickPreset(p.id)}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                              p.id === quickPreset
                                ? "bg-brand-primary text-white"
                                : "bg-background text-foreground-secondary hover:text-foreground"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Go button */}
                    <button
                      type="button"
                      onClick={handleQuickStart}
                      className="h-10 w-full rounded-xl bg-brand-primary text-sm font-semibold uppercase tracking-wider text-white transition-all hover:bg-brand-primary/90 active:scale-[0.98]"
                    >
                      Go
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT COLUMN — Image Panel ── */}
        <div className="flex w-full items-center">
          <IntroImagePanel
            src={accentImage}
            caption={imageCaption}
            delay={0.6}
          />
        </div>
      </div>

    </div>
  );
}
