"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  total: number;
  activeFilterCount: number;
  onRefineClick: () => void;
};

export function PeopleCategoryBarB({
  query,
  onQueryChange,
  total,
  activeFilterCount,
  onRefineClick,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry!.isIntersecting);
      },
      { threshold: 0, rootMargin: "-82px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
      <div
        className={cn(
          "sticky transition-[background-color,box-shadow] duration-300",
          isStuck ? "z-50" : "z-40",
          !isStuck && "bg-transparent",
        )}
        style={{
          top: isStuck ? "calc(var(--header-h) - 3px)" : "var(--header-h)",
          backgroundColor: isStuck ? "var(--card)" : undefined,
          boxShadow: isStuck ? "var(--shadow-sm)" : "none",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Search row */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
            {/* Count */}
            <span className="hidden shrink-0 text-xs font-medium text-[var(--muted-foreground)] whitespace-nowrap sm:inline">
              {total.toLocaleString()} people
            </span>

            {/* Search input */}
            <div className="relative w-full max-w-sm min-w-0">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search by name or specialty"
                className="w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-3 py-2.5 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition"
              />
            </div>

            {/* Refine button */}
            <button
              type="button"
              onClick={onRefineClick}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
                activeFilterCount > 0
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]",
              )}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                />
              </svg>
              <span className="hidden sm:inline">Refine</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
