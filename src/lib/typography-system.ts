import { cva } from "class-variance-authority";

/**
 * Centralized typography system for Variant A (Warm Editorial).
 *
 * Three font families:
 *   - Editorial (Serif / Cormorant): narrative text, large headings, quotes
 *   - Utility (Sans / Plus Jakarta Sans): UI labels, buttons, data, metadata
 *   - Mono (Geist Mono): stats, prices, IATA codes, nav numbers
 *
 * Usage:
 *   import { typography } from "@/lib/typography-system";
 *   <h1 className={typography({ intent: "editorial-hero" })}>Title</h1>
 */
export const typography = cva("", {
  variants: {
    intent: {
      // ── Editorial (Serif - Cormorant) ──────────────────────
      /** Massive hero headlines */
      "editorial-hero":
        "font-serif text-5xl md:text-7xl font-semibold leading-[1.05] tracking-normal text-foreground",
      /** Page-level headings */
      "editorial-h1":
        "font-serif text-3xl md:text-5xl font-semibold leading-[1.1] tracking-normal text-foreground",
      /** Section headings */
      "editorial-h2":
        "font-serif text-2xl md:text-3xl font-semibold leading-snug text-foreground",
      /** Sub-section headings */
      "editorial-h3":
        "font-serif text-xl md:text-2xl font-semibold leading-snug text-foreground",
      /** Long-form reading text */
      "editorial-prose":
        "font-serif text-lg leading-relaxed text-foreground",
      /** Pull quotes, testimonials */
      "editorial-quote":
        "font-serif text-xl italic leading-relaxed text-foreground-secondary",

      // ── Utility (Sans - Plus Jakarta Sans) ─────────────────
      /** Functional page headings */
      "utility-h1":
        "font-sans text-2xl font-bold tracking-tight text-foreground",
      /** Card / component headings */
      "utility-h2":
        "font-sans text-xl font-semibold text-foreground",
      /** Standard body text */
      "utility-body":
        "font-sans text-base leading-relaxed text-foreground",
      /** Muted body text */
      "utility-body-muted":
        "font-sans text-base leading-relaxed text-foreground-secondary",
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
