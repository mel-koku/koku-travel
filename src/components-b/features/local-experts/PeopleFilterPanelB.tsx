"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PeopleSortOption } from "@/hooks/usePeopleFilters";

const TOP_CITIES_COUNT = 12;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  cities: string[];
  cityCountMap: Record<string, number>;
  languages: string[];
  selectedCity: string | null;
  onCityChange: (c: string | null) => void;
  selectedLanguage: string | null;
  onLanguageChange: (l: string | null) => void;
  sort: PeopleSortOption;
  onSortChange: (s: PeopleSortOption) => void;
  onClearAll: () => void;
  resultCount: number;
};

const SORT_OPTIONS: { label: string; value: PeopleSortOption }[] = [
  { label: "Recommended", value: "recommended" },
  { label: "Most experienced", value: "experience" },
  { label: "Name A-Z", value: "name" },
];

export function PeopleFilterPanelB({
  isOpen,
  onClose,
  cities,
  cityCountMap,
  languages,
  selectedCity,
  onCityChange,
  selectedLanguage,
  onLanguageChange,
  sort,
  onSortChange,
  onClearAll,
  resultCount,
}: Props) {
  const [citySearch, setCitySearch] = useState("");
  const [showAllCities, setShowAllCities] = useState(false);

  // Cities already sorted by count desc from the hook
  const topCities = cities.slice(0, TOP_CITIES_COUNT);
  const hasMore = cities.length > TOP_CITIES_COUNT;

  const searchedCities = useMemo(() => {
    if (!citySearch.trim()) return showAllCities ? cities : topCities;
    const q = citySearch.toLowerCase();
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, topCities, showAllCities, citySearch]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-charcoal/30"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-md flex-col bg-white shadow-[var(--shadow-depth)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Refine
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)]"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Sort */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  Sort by
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onSortChange(opt.value)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        sort === opt.value
                          ? "bg-[var(--foreground)] text-white"
                          : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  City
                </p>

                {/* Search input */}
                {cities.length > TOP_CITIES_COUNT && (
                  <div className="relative mt-3">
                    <svg
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Search cities..."
                      className="h-9 w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onCityChange(null)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      !selectedCity
                        ? "bg-[var(--foreground)] text-white"
                        : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    All cities
                  </button>
                  {searchedCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() =>
                        onCityChange(selectedCity === city ? null : city)
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        selectedCity === city
                          ? "bg-[var(--foreground)] text-white"
                          : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {city}
                      <span className="ml-1 text-xs opacity-50">{cityCountMap[city]}</span>
                    </button>
                  ))}
                </div>

                {/* Show more / less toggle */}
                {hasMore && !citySearch && (
                  <button
                    type="button"
                    onClick={() => setShowAllCities(!showAllCities)}
                    className="mt-2 text-xs font-medium text-[var(--primary)] hover:underline"
                  >
                    {showAllCities
                      ? "Show fewer"
                      : `Show all ${cities.length} cities`}
                  </button>
                )}
              </div>

              {/* Language */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  Language
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onLanguageChange(null)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      !selectedLanguage
                        ? "bg-[var(--foreground)] text-white"
                        : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    Any language
                  </button>
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        onLanguageChange(
                          selectedLanguage === lang ? null : lang
                        )
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        selectedLanguage === lang
                          ? "bg-[var(--foreground)] text-white"
                          : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                onClick={onClearAll}
                className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
              >
                Show {resultCount} results
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
