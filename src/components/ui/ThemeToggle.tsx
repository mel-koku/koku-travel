"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCursor } from "@/providers/CursorProvider";
import { Tooltip } from "@/components/ui/Tooltip";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { setCursorState } = useCursor();
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Placeholder to avoid layout shift
    return <div className="h-11 w-11" />;
  }

  const isDark = theme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <Tooltip content={isDark ? "Switch to light mode" : "Switch to dark mode"} side="bottom">
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => setCursorState("link")}
        onMouseLeave={() => setCursorState("default")}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.svg
              key="sun"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.6 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.25 }}
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </motion.svg>
          ) : (
            <motion.svg
              key="moon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.6 }}
              transition={{ duration: 0.25 }}
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}
