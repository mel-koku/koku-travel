"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonType } from "@/types/person";

const TYPE_TABS: { label: string; value: PersonType | null }[] = [
  { label: "All", value: null },
  { label: "Artisans", value: "artisan" },
  { label: "Guides", value: "guide" },
  { label: "Interpreters", value: "interpreter" },
  { label: "Authors", value: "author" },
];

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  activeType: PersonType | null;
  onTypeChange: (t: PersonType | null) => void;
  typeCounts: Record<PersonType, number>;
  total: number;
  activeFilterCount: number;
  onRefineClick: () => void;
};

export function PeopleCategoryBarB({
  query,
  onQueryChange,
  activeType,
  onTypeChange,
  typeCounts,
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
      <div ref={sentinelRef} className="h-0" aria-hidden />
      <div
        className={`sticky top-[var(--header-h)] z-30 transition-shadow duration-200 ${
          isStuck
            ? "bg-white shadow-[var(--shadow-sm)]"
            : "bg-[var(--background)]"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Count */}
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:block">
            {total}
          </span>

          {/* Type tabs */}
          <div className="flex items-center gap-1">
            {TYPE_TABS.map((tab) => {
              const isActive = activeType === tab.value;
              const count =
                tab.value === null
                  ? total
                  : typeCounts[tab.value] ?? 0;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => onTypeChange(tab.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--foreground)] text-white"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs ${
                      isActive ? "text-white/70" : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
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
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search by name or specialty"
              className="h-9 w-44 rounded-xl border border-[var(--border)] bg-white pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 sm:w-56"
            />
          </div>

          {/* Refine button */}
          <button
            type="button"
            onClick={onRefineClick}
            className="relative flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
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
            Refine
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
