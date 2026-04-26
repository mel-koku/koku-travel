"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { easePageTransitionMut } from "@/lib/motion";

type PageTransitionProps = {
  children: ReactNode;
};

const COVER_DURATION = 0.4;
const REVEAL_DURATION = 0.5;

type RitualFamily = "trip-builder" | "itinerary" | null;

/**
 * Classify a pathname into a "ritual" route family. The editorial reveal
 * is reserved for entry into one of these families — everything else
 * (guides, places, landing, account, etc.) bypasses the curtain.
 *
 * Strict prefix match guards against false positives like
 * `/trip-builder-faq` accidentally matching `/trip-builder`.
 */
function ritualFamily(pathname: string): RitualFamily {
  if (pathname === "/trip-builder" || pathname.startsWith("/trip-builder/")) {
    return "trip-builder";
  }
  if (pathname === "/itinerary" || pathname.startsWith("/itinerary/")) {
    return "itinerary";
  }
  return null;
}

/**
 * The curtain animates only on entry into a ritual route family (i.e. the
 * incoming path is in a ritual family AND the previous path was not in the
 * same family). Cross-family ritual moves (e.g. trip-builder → itinerary)
 * still count as entry to the new family. Internal nav within a family,
 * exits, and routine moves between non-ritual pages bypass.
 */
function shouldAnimateTransition(from: string, to: string): boolean {
  const toFamily = ritualFamily(to);
  if (!toFamily) return false;
  return ritualFamily(from) !== toFamily;
}

/**
 * Page transition wrapper — scoped two-phase overlay.
 *
 * On route change:
 * 1. If the transition is a ritual entry (into `/trip-builder` or
 *    `/itinerary/*`), play the cover/reveal sequence and reset scroll
 *    while covered.
 * 2. Otherwise (routine nav, ritual internal nav, ritual exits),
 *    bypass the curtain — scroll-to-top still fires so users don't
 *    land mid-scroll on the new page.
 * 3. Reduced motion: always bypass with a scroll-to-top.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { lenis, pause, resume } = useLenis();
  const prevPathname = useRef(pathname);
  const [phase, setPhase] = useState<"idle" | "covering" | "revealing">("idle");

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    const previousPath = prevPathname.current;
    prevPathname.current = pathname;

    const animate =
      !prefersReducedMotion && shouldAnimateTransition(previousPath, pathname);

    if (!animate) {
      // Bypass: scroll-to-top so users don't land mid-scroll on the new page,
      // but no curtain, no Lenis pause/resume.
      lenis?.scrollTo(0, { immediate: true });
      return;
    }

    // Phase 1: Cover screen instantly
    setPhase("covering");
    pause();

    // Phase 2: After a beat, scroll to top and start reveal
    const revealTimer = setTimeout(() => {
      lenis?.scrollTo(0, { immediate: true });
      setPhase("revealing");
    }, COVER_DURATION * 1000 + 50);

    // Phase 3: Cleanup after reveal completes
    const cleanupTimer = setTimeout(() => {
      setPhase("idle");
      resume();
    }, (COVER_DURATION + REVEAL_DURATION) * 1000 + 150);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(cleanupTimer);
    };
  }, [pathname, prefersReducedMotion, lenis, pause, resume]);

  return (
    <>
      {children}
      <AnimatePresence>
        {phase === "covering" && (
          <motion.div
            key="cover"
            className="fixed inset-0 z-[90] bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.05 }}
            style={{ pointerEvents: "all" }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "revealing" && (
          <motion.div
            key="reveal"
            className="fixed inset-0 z-[90] bg-background"
            initial={{ clipPath: "circle(150% at 50% 50%)" }}
            animate={{ clipPath: "circle(0% at 50% 50%)" }}
            transition={{
              duration: REVEAL_DURATION,
              ease: easePageTransitionMut,
            }}
            style={{ pointerEvents: "all" }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
