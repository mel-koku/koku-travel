// ─────────────────────────────────────────────────────────
// Yuku Japan — Unified Motion System
// ─────────────────────────────────────────────────────────
// Single source of truth for all animation values.
// Import tokens by name; never hardcode easing / duration / stagger.

// ── Easing Curves ────────────────────────────────────────

/** Reveal animations: text splits, scroll reveals, viewport entries, number counts */
export const easeReveal = [0.33, 1, 0.68, 1] as const;

/** Slow atmospheric transforms: image hovers, Ken Burns, gradient overlays */
export const easeCinematic = [0.215, 0.61, 0.355, 1] as const;

/** Full-viewport state changes: page wipes, menu overlays, wizard steps */
export const easePageTransition = [0.76, 0, 0.24, 1] as const;

/** Scroll indicator bounce loops (hero sections) */
export const easeScrollIndicator = [0.45, 0, 0.55, 1] as const;

/** Warm editorial: smooth, deliberate transitions */
export const easeEditorial = [0.22, 1, 0.36, 1] as const;

// Mutable tuple casts for framer-motion Variants (readonly tuples not accepted)
type Ease4 = [number, number, number, number];
export const easeRevealMut: Ease4 = [...easeReveal];
export const easeCinematicMut: Ease4 = [...easeCinematic];
export const easePageTransitionMut: Ease4 = [...easePageTransition];
export const easeScrollIndicatorMut: Ease4 = [...easeScrollIndicator];
export const easeEditorialMut: Ease4 = [...easeEditorial];

// CSS string equivalents (for inline styles & Tailwind arbitrary values)
export const easeRevealCSS = 'cubic-bezier(0.33, 1, 0.68, 1)';
export const easeCinematicCSS = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
export const easePageTransitionCSS = 'cubic-bezier(0.76, 0, 0.24, 1)';
export const easeEditorialCSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

// ── Duration Scale ───────────────────────────────────────

/** Tooltips, icon states */
export const durationMicro = 0.15;

/** Panel slides, dropdowns, status swaps, button interactions */
export const durationFast = 0.3;

/** SplitText, TextReveal, card viewport entries */
export const durationBase = 0.4;

/** ScrollReveal, hero title reveals, page clip-path enters */
export const durationSlow = 0.5;

/** Image hovers, cinematic transitions, click-to-scroll */
export const durationCinematic = 1.2;

/** Scroll indicator loops, ambient animations */
export const durationEpic = 2.0;

// ── Stagger Delays ───────────────────────────────────────

/** Word-level reveals (SplitText default, TextReveal, overlay text) */
export const staggerWord = 0.04;

/** List items (location grids, guide grids, menu items) */
export const staggerItem = 0.08;

/** Section-level staggers (VibeCard entrances) */
export const staggerSection = 0.12;

// ── Image Hover Scales ───────────────────────────────────

/** Standard cards (LocationCard, GuideCard, EditorialCard, RegionCard) */
export const hoverScaleCard = 1.04;

/** Editorial / featured items (LinkedLocations, GuideFooter, FeaturedGuides) */
export const hoverScaleEditorial = 1.02;

/** Full-bleed immersive cards (VibeCard) */
export const hoverScaleImmersive = 1.1;

// ── Parallax Scales ──────────────────────────────────────

/** Hero sections (HeroOpening, GuideHero) — scale from→to */
export const parallaxHero = { from: 1.08, to: 1 } as const;

/** Mid-page sections (Philosophy, TestimonialTheater) */
export const parallaxSection = { from: 1.05, to: 1 } as const;

/** Subtle Y-axis offset (PageHeader, IntroStep backgrounds) */
export const parallaxSubtle = { from: '0%', to: '8%' } as const;

/** Zoom-in effect (FinalCTA background) */
export const parallaxZoomIn = { from: 1, to: 1.08 } as const;

// ── Page Transition Durations ────────────────────────────

/** Clip-path circle() reveal overlay */
export const pageTransitionDuration = 0.5;

/** Overlay fade-out after reveal */
export const pageTransitionExitDuration = 0.4;

// ── Spring Presets ───────────────────────────────────────

/** Interactive elements: selection checkmarks, magnetic snap */
export const springInteraction = { stiffness: 300, damping: 20 } as const;

/** Header show/hide transitions */
export const springNavigation = { stiffness: 300, damping: 30 } as const;

