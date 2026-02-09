"use client";

import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

/**
 * Page transition wrapper. Each page handles its own entrance animations
 * (SplitText, ScrollReveal, phased loads) rather than a global clip-path wipe.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return <>{children}</>;
}
