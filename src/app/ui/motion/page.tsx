"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useRef, useState } from "react";

import {
  durationBase,
  durationCinematic,
  durationEpic,
  durationFast,
  durationMicro,
  durationSlow,
  easeCinematic,
  easePageTransition,
  easeReveal,
  hoverScaleCard,
  hoverScaleEditorial,
  hoverScaleImmersive,
  parallaxHero,
  parallaxSection,
  parallaxSubtle,
  parallaxZoomIn,
  springCursor,
  springInteraction,
  springNavigation,
  staggerChar,
  staggerItem,
  staggerSection,
  staggerWord,
} from "@/lib/motion";

// ── Easing Curves ──────────────────────────────────────

const curves = [
  {
    name: "easeReveal",
    values: easeReveal,
    css: `cubic-bezier(${easeReveal.join(", ")})`,
    description: "Text splits, scroll reveals, viewport entries",
  },
  {
    name: "easeCinematic",
    values: easeCinematic,
    css: `cubic-bezier(${easeCinematic.join(", ")})`,
    description: "Image hovers, Ken Burns, gradient overlays",
  },
  {
    name: "easePageTransition",
    values: easePageTransition,
    css: `cubic-bezier(${easePageTransition.join(", ")})`,
    description: "Page wipes, menu overlays, wizard steps",
  },
];

function EasingDemo() {
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState(0);

  const play = () => {
    setPlaying(true);
    setKey((k) => k + 1);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl italic text-foreground">
            Easing Curves
          </h2>
          <p className="text-sm text-foreground-secondary">
            Three curves covering reveal, atmospheric, and structural
            transitions.
          </p>
        </div>
        <button
          onClick={play}
          className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground-secondary/30"
        >
          Play
        </button>
      </div>

      <div className="space-y-4">
        {curves.map(({ name, css, description, values }) => (
          <div
            key={name}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-sm text-brand-primary">
                {name}
              </span>
              <span className="font-mono text-xs text-stone">{css}</span>
            </div>
            <p className="mb-4 text-xs text-foreground-secondary">
              {description}
            </p>
            <div className="relative h-10 rounded-lg bg-background px-1">
              <motion.div
                key={`${name}-${key}`}
                className="absolute top-1 h-8 w-8 rounded-lg bg-brand-primary"
                initial={{ left: "0.25rem" }}
                animate={
                  playing
                    ? { left: "calc(100% - 2.25rem)" }
                    : { left: "0.25rem" }
                }
                transition={{
                  duration: durationSlow,
                  ease: [...values] as [number, number, number, number],
                }}
                onAnimationComplete={() => setPlaying(false)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Duration Scale ─────────────────────────────────────

const durations = [
  { name: "micro", value: durationMicro, usage: "Tooltips, icon states" },
  {
    name: "fast",
    value: durationFast,
    usage: "Dropdowns, button interactions",
  },
  { name: "base", value: durationBase, usage: "Card entries, text reveals" },
  { name: "slow", value: durationSlow, usage: "Hero reveals, page enters" },
  {
    name: "cinematic",
    value: durationCinematic,
    usage: "Image hovers, transitions",
  },
  { name: "epic", value: durationEpic, usage: "Ambient loops, scroll cues" },
];

function DurationDemo() {
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState(0);

  const play = () => {
    setPlaying(true);
    setKey((k) => k + 1);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl italic text-foreground">
            Duration Scale
          </h2>
          <p className="text-sm text-foreground-secondary">
            Six durations from 0.15s to 2.0s. All bars animate simultaneously —
            shorter durations finish first.
          </p>
        </div>
        <button
          onClick={play}
          className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground-secondary/30"
        >
          Play
        </button>
      </div>

      <div className="space-y-3">
        {durations.map(({ name, value, usage }, i) => (
          <div key={name} className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-brand-primary">
                {name}
              </span>
              <span className="font-mono text-xs text-stone">{value}s</span>
              <span className="text-xs text-foreground-secondary">{usage}</span>
            </div>
            <div className="h-6 overflow-hidden rounded-lg bg-surface">
              <motion.div
                key={`dur-${name}-${key}`}
                className="h-full rounded-lg"
                style={{
                  background: `color-mix(in oklch, var(--color-brand-primary) ${100 - i * 12}%, var(--color-sage) ${i * 12}%)`,
                }}
                initial={{ width: "0%" }}
                animate={playing ? { width: "100%" } : { width: "0%" }}
                transition={{
                  duration: value,
                  ease: [...easeReveal] as [number, number, number, number],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Stagger Delays ─────────────────────────────────────

const staggers = [
  { name: "char", value: staggerChar, usage: "Character-level reveals" },
  { name: "word", value: staggerWord, usage: "Word-level reveals" },
  { name: "item", value: staggerItem, usage: "List items, grid entries" },
  { name: "section", value: staggerSection, usage: "Section-level staggers" },
];

function StaggerDemo() {
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState(0);

  const play = () => {
    setPlaying(true);
    setKey((k) => k + 1);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl italic text-foreground">
            Stagger Delays
          </h2>
          <p className="text-sm text-foreground-secondary">
            Four stagger presets controlling the delay between successive items
            in a sequence.
          </p>
        </div>
        <button
          onClick={play}
          className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground-secondary/30"
        >
          Play
        </button>
      </div>

      <div className="space-y-5">
        {staggers.map(({ name, value, usage }) => (
          <div key={name}>
            <div className="mb-2 flex items-baseline gap-3">
              <span className="font-mono text-xs text-brand-primary">
                stagger{name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
              <span className="font-mono text-xs text-stone">{value}s</span>
              <span className="text-xs text-foreground-secondary">{usage}</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={`stag-${name}-${i}-${key}`}
                  className="h-8 w-8 rounded-md bg-brand-primary/80"
                  initial={{ opacity: 0, y: 12 }}
                  animate={
                    playing
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 12 }
                  }
                  transition={{
                    duration: durationFast,
                    delay: playing ? i * value : 0,
                    ease: [...easeReveal] as [number, number, number, number],
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Hover Scales ───────────────────────────────────────

const hoverScales = [
  {
    name: "hoverScaleCard",
    value: hoverScaleCard,
    usage: "LocationCard, GuideCard, RegionCard",
  },
  {
    name: "hoverScaleEditorial",
    value: hoverScaleEditorial,
    usage: "LinkedLocations, FeaturedGuides",
  },
  {
    name: "hoverScaleImmersive",
    value: hoverScaleImmersive,
    usage: "VibeCard, full-bleed imagery",
  },
];

function HoverScaleDemo() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl italic text-foreground">
          Hover Scales
        </h2>
        <p className="text-sm text-foreground-secondary">
          Three scale levels for interactive hover feedback. Hover each card to
          preview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {hoverScales.map(({ name, value, usage }) => (
          <motion.div
            key={name}
            className="flex cursor-default flex-col gap-3 rounded-xl border border-border bg-surface p-5"
            whileHover={{ scale: value }}
            transition={{
              duration: durationCinematic,
              ease: [...easeCinematic] as [number, number, number, number],
            }}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-brand-primary">
                {name}
              </span>
              <span className="font-mono text-xs text-stone">
                {value.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-foreground-secondary">{usage}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Spring Presets ──────────────────────────────────────

function SpringDemo() {
  const [clicked, setClicked] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, springCursor);
  const springY = useSpring(cursorY, springCursor);
  const cursorRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      cursorX.set(e.clientX - rect.left - 8);
      cursorY.set(e.clientY - rect.top - 8);
    },
    [cursorX, cursorY],
  );

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl italic text-foreground">
          Spring Presets
        </h2>
        <p className="text-sm text-foreground-secondary">
          Three spring configurations for physically-grounded motion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Interaction spring */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-brand-primary">
              springInteraction
            </span>
          </div>
          <p className="font-mono text-xs text-stone">
            stiffness: {springInteraction.stiffness}, damping:{" "}
            {springInteraction.damping}
          </p>
          <p className="mb-2 text-xs text-foreground-secondary">
            Selection checkmarks, magnetic snap
          </p>
          <div className="flex items-center justify-center py-4">
            <motion.button
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-foreground"
              animate={clicked ? { scale: 0.85 } : { scale: 1 }}
              transition={{ type: "spring", ...springInteraction }}
              onTap={() => {
                setClicked(true);
                setTimeout(() => setClicked(false), 300);
              }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Navigation spring */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-brand-primary">
              springNavigation
            </span>
          </div>
          <p className="font-mono text-xs text-stone">
            stiffness: {springNavigation.stiffness}, damping:{" "}
            {springNavigation.damping}
          </p>
          <p className="mb-2 text-xs text-foreground-secondary">
            Header show/hide transitions
          </p>
          <div className="relative h-20 overflow-hidden rounded-lg bg-background">
            <AnimatePresence>
              {panelOpen && (
                <motion.div
                  className="absolute inset-x-0 top-0 h-10 bg-brand-primary/20 px-3 py-2"
                  initial={{ y: -40 }}
                  animate={{ y: 0 }}
                  exit={{ y: -40 }}
                  transition={{ type: "spring", ...springNavigation }}
                >
                  <span className="text-xs text-foreground-secondary">
                    Header panel
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-border px-3 py-1 text-xs text-foreground-secondary hover:text-foreground"
              onClick={() => setPanelOpen(!panelOpen)}
            >
              {panelOpen ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Cursor spring */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-brand-primary">
              springCursor
            </span>
          </div>
          <p className="font-mono text-xs text-stone">
            stiffness: {springCursor.stiffness}, damping: {springCursor.damping}
            , mass: {springCursor.mass}
          </p>
          <p className="mb-2 text-xs text-foreground-secondary">
            Custom cursor follow
          </p>
          <div
            ref={cursorRef}
            className="relative h-20 cursor-none overflow-hidden rounded-lg bg-background"
            onMouseMove={handleMouseMove}
          >
            <motion.div
              className="pointer-events-none absolute h-4 w-4 rounded-full bg-brand-primary"
              style={{ x: springX, y: springY }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs text-stone">
              Move mouse here
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Parallax Presets ───────────────────────────────────

const parallaxPresets = [
  {
    name: "parallaxHero",
    from: String(parallaxHero.from),
    to: String(parallaxHero.to),
    type: "scale",
    usage: "HeroOpening, GuideHero",
  },
  {
    name: "parallaxSection",
    from: String(parallaxSection.from),
    to: String(parallaxSection.to),
    type: "scale",
    usage: "Philosophy, TestimonialTheater",
  },
  {
    name: "parallaxSubtle",
    from: parallaxSubtle.from,
    to: parallaxSubtle.to,
    type: "Y offset",
    usage: "PageHeader, IntroStep backgrounds",
  },
  {
    name: "parallaxZoomIn",
    from: String(parallaxZoomIn.from),
    to: String(parallaxZoomIn.to),
    type: "scale",
    usage: "FinalCTA background",
  },
];

function ParallaxReference() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl italic text-foreground">
          Parallax Presets
        </h2>
        <p className="text-sm text-foreground-secondary">
          Four scroll-driven transform configurations. These require scroll
          context so are shown as a reference table.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-mono text-xs font-normal text-stone">
                Token
              </th>
              <th className="px-4 py-3 text-left font-mono text-xs font-normal text-stone">
                Type
              </th>
              <th className="px-4 py-3 text-left font-mono text-xs font-normal text-stone">
                From
              </th>
              <th className="px-4 py-3 text-left font-mono text-xs font-normal text-stone">
                To
              </th>
              <th className="px-4 py-3 text-left text-xs font-normal text-stone">
                Usage
              </th>
            </tr>
          </thead>
          <tbody>
            {parallaxPresets.map(({ name, from, to, type, usage }) => (
              <tr key={name} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-mono text-xs text-brand-primary">
                  {name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {type}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {from}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">
                  {to}
                </td>
                <td className="px-4 py-3 text-xs text-foreground-secondary">
                  {usage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────

export default function MotionPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-12 sm:px-10 sm:py-16">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Design System
        </span>
        <h1 className="font-serif text-4xl italic leading-tight text-foreground">
          Motion
        </h1>
        <p className="max-w-2xl text-lg text-foreground-secondary">
          A unified motion system with three easing curves, six durations, four
          staggers, three springs, and four parallax presets. All values imported
          from a single source of truth.
        </p>
      </header>

      <EasingDemo />
      <DurationDemo />
      <StaggerDemo />
      <HoverScaleDemo />
      <SpringDemo />
      <ParallaxReference />
    </div>
  );
}
