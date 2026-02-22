"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type StickyPlacesHeaderProps = {
  resultsCount: number;
  onFiltersClick: () => void;
  activeFilterCount: number;
  /** When true, the header is completely hidden (e.g. while hero is pinned) */
  hidden?: boolean;
};

const SCROLL_THRESHOLD = 300;

export function StickyPlacesHeader({
  resultsCount,
  onFiltersClick,
  activeFilterCount,
  hidden = false,
}: StickyPlacesHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Track scroll position to show/hide sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // If parent says hidden (hero is pinned), don't show regardless of scroll
  const shouldShow = isVisible && !hidden;

  const buttonContent = (
    <>
      {/* Search icon */}
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span>Filters</span>
      <span className="text-brand-primary/70">
        ({resultsCount.toLocaleString()})
      </span>
      {activeFilterCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
          {activeFilterCount}
        </span>
      )}
    </>
  );

  const buttonClassName = cn(
    "flex items-center gap-2 rounded-full border border-brand-primary bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-primary shadow-sm transition-all hover:bg-surface hover:shadow-md"
  );

  return (
    <div
      className={cn(
        "sticky top-20 z-40 transition-all duration-300 pointer-events-none",
        shouldShow ? "h-auto opacity-100" : "h-0 overflow-hidden opacity-0"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2 py-3 pointer-events-auto">
          <button onClick={onFiltersClick} className={buttonClassName}>
            {buttonContent}
          </button>
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-secondary shadow-sm transition-all hover:border-brand-primary hover:text-brand-primary hover:shadow-md"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
