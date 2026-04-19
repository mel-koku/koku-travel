"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";

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
      ? "Almost gone. Trip Pass is free for our final few travellers."
      : `Trip Pass is free for our first ${total} travellers.`;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  };

  return (
    <motion.aside
      role="region"
      aria-label="Launch promotion announcement"
      className="fixed left-0 right-0 top-0 z-[60] flex h-10 items-center border-b border-default bg-canvas sm:h-9"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <span
          className={cn(
            typography({ intent: "utility-label" }),
            "hidden shrink-0 sm:inline-block",
          )}
        >
          Launch offer
        </span>
        <Link
          href="/pricing"
          className={cn(
            typography({ intent: "utility-body" }),
            "flex-1 text-center text-foreground hover:underline underline-offset-4",
          )}
        >
          {centerCopy}
        </Link>
        {!isSoldOut && (
          <>
            <span
              className={cn(
                typography({ intent: "utility-tabular" }),
                "hidden shrink-0 sm:inline-block",
              )}
              aria-hidden="true"
            >
              {remaining} / {total}
            </span>
            <span aria-live="polite" className="sr-only">
              {remaining} of {total} remaining
            </span>
          </>
        )}
        <button
          type="button"
          aria-label="Dismiss launch announcement"
          onClick={handleDismiss}
          className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded text-foreground-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          &times;
        </button>
      </div>
    </motion.aside>
  );
}
