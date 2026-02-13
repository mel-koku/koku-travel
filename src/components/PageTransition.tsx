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

/**
 * Page transition wrapper — two-phase overlay.
 *
 * On route change:
 * 1. Overlay instantly covers the screen (full circle, no animation gap)
 * 2. Scroll resets to top while covered
 * 3. Overlay circle shrinks away to reveal the new page
 * 4. Reduced motion: simple scroll-to-top
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { lenis, pause, resume } = useLenis();
  const prevPathname = useRef(pathname);
  const [phase, setPhase] = useState<"idle" | "covering" | "revealing">("idle");

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    if (prefersReducedMotion) {
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
