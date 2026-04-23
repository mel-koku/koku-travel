"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

type LaunchBannerProps = {
  initialRemaining: number | null;
  initialTotal: number | null;
};

const ALMOST_GONE_THRESHOLD = 20;
const DISMISS_KEY = "yuku.launch-banner.v1.dismissed";

export function LaunchBanner({ initialRemaining, initialTotal }: LaunchBannerProps) {
  const [remaining, setRemaining] = useState<number | null>(initialRemaining);
  const [total, setTotal] = useState<number | null>(initialTotal);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") {
      document.documentElement.style.setProperty("--header-h", "80px");
      const header = document.querySelector("header.fixed") as HTMLElement | null;
      if (header) header.style.top = "";
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/launch-pricing");
        if (!res.ok) return;
        const data: { remaining: number | null; total: number | null } =
          await res.json();
        if (data.remaining !== null) setRemaining(data.remaining);
        if (data.total !== null) setTotal(data.total);
      } catch {
        // ignore transient errors; keep last known count
      }
    };
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;
  if (remaining === null || total === null) return null;

  const isSoldOut = remaining === 0;
  const isAlmostGone = remaining > 0 && remaining <= ALMOST_GONE_THRESHOLD;

  const centerCopy = isSoldOut
    ? "Launch pricing now live from $19."
    : isAlmostGone
      ? `Only ${remaining} spots left. Trip Pass is free until they're gone.`
      : `Trip Pass is free for our first ${total} travellers. ${remaining} spots remain.`;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
      document.documentElement.style.setProperty("--header-h", "80px");
      const header = document.querySelector("header.fixed") as HTMLElement | null;
      if (header) header.style.top = "";
    }
    setDismissed(true);
  };

  return (
    <motion.aside
      role="region"
      aria-label="Launch promotion announcement"
      className="fixed left-0 right-0 top-0 z-[60] flex h-10 items-center bg-charcoal"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center px-4 sm:px-6">
        <Link
          href="/pricing"
          className="flex-1 text-center font-serif text-[15px] italic leading-none tracking-[0.02em] text-white/85 hover:text-white transition-colors"
        >
          {centerCopy}
        </Link>
        <span aria-live="polite" className="sr-only">
          {isAlmostGone
            ? `Only ${remaining} spots remaining`
            : !isSoldOut
              ? `${remaining} of ${total} spots remaining`
              : "Launch pricing now live"}
        </span>
        <button
          type="button"
          aria-label="Dismiss launch announcement"
          onClick={handleDismiss}
          className="ml-4 flex h-8 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
        >
          {/* × on mobile, CLOSE on sm+ */}
          <span className="text-white/40 hover:text-white/70 transition-colors text-[15px] sm:hidden">&times;</span>
          <span className="hidden sm:inline font-mono text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-white/60 transition-colors">CLOSE</span>
        </button>
      </div>
    </motion.aside>
  );
}
