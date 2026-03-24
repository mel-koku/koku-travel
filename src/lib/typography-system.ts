import { cva } from "class-variance-authority";

/**
 * Centralized typography system for Variant A (Warm Editorial).
 *
 * Two font families:
 *   - Editorial (Serif / Newsreader): narrative text, large headings, quotes
 *   - Utility (Sans / Geist Sans): UI labels, buttons, data, metadata
 *
 * Usage:
 *   import { typography } from "@/lib/typography-system";
 *   <h1 className={typography({ intent: "editorial-hero" })}>Title</h1>
 */
export const typography = cva("", {
  variants: {
    intent: {
      // ── Editorial (Serif - Newsreader) ──────────────────────
      /** Massive hero headlines */
      "editorial-hero":
        "font-serif text-5xl md:text-7xl font-medium tracking-tight text-foreground",
      /** Page-level headings */
      "editorial-h1":
        "font-serif text-3xl md:text-5xl font-medium tracking-tight text-foreground",
      /** Section headings */
      "editorial-h2":
        "font-serif text-2xl md:text-3xl font-medium text-foreground",
      /** Sub-section headings */
      "editorial-h3":
        "font-serif text-xl md:text-2xl font-medium text-foreground",
      /** Long-form reading text */
      "editorial-prose":
        "font-serif text-lg leading-relaxed text-foreground",
      /** Pull quotes, testimonials */
      "editorial-quote":
        "font-serif text-xl italic text-foreground-secondary",

      // ── Utility (Sans - Geist Sans) ─────────────────────────
      /** Functional page headings */
      "utility-h1":
        "font-sans text-2xl font-semibold tracking-tight text-foreground",
      /** Card / component headings */
      "utility-h2":
        "font-sans text-xl font-semibold text-foreground",
      /** Standard body text */
      "utility-body":
        "font-sans text-base text-foreground",
      /** Muted body text */
      "utility-body-muted":
        "font-sans text-base text-foreground-secondary",
      /** Small uppercase labels, nav items, buttons */
      "utility-label":
        "font-sans text-sm font-medium tracking-wide text-foreground-secondary uppercase",
      /** Tabular numbers for stats, prices, dates */
      "utility-tabular":
        "font-mono tabular-nums text-sm text-foreground",
      /** Tiny metadata captions */
      "utility-meta":
        "font-sans text-xs text-foreground-secondary",
    },
  },
});
