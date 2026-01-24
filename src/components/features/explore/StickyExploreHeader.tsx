"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type StickyExploreHeaderProps = {
  resultsCount: number;
  onFiltersClick: () => void;
  activeFilterCount: number;
};

const SCROLL_THRESHOLD = 80;

export function StickyExploreHeader({
  resultsCount,
  onFiltersClick,
  activeFilterCount,
}: StickyExploreHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Track scroll position to collapse/expand header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsCollapsed(scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      <span className="text-red-400">
        ({resultsCount.toLocaleString()})
      </span>
      {activeFilterCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
          {activeFilterCount}
        </span>
      )}
    </>
  );

  const buttonClassName = cn(
    "flex items-center gap-2 rounded-full border border-red-500 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-500 transition hover:bg-red-50"
  );

  return (
    <>
      {/* Expanded header - shows when at top of page */}
      <div
        className={cn(
          "bg-white transition-all duration-300",
          isCollapsed ? "h-0 overflow-hidden opacity-0" : "h-auto opacity-100"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
            <button onClick={onFiltersClick} className={buttonClassName}>
              {buttonContent}
            </button>
            <p className="text-xs text-gray-500">
              Your favorites and itineraries are in the{" "}
              <Link href="/dashboard" className="text-red-500 hover:text-red-600 underline">
                Dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Sticky collapsed header - shows when scrolled */}
      <div
        className={cn(
          "sticky top-20 z-40 transition-all duration-300 pointer-events-none",
          isCollapsed ? "h-auto opacity-100" : "h-0 overflow-hidden opacity-0"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 py-3 pointer-events-auto">
            <button onClick={onFiltersClick} className={buttonClassName}>
              {buttonContent}
            </button>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:border-red-500 hover:text-red-500"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
