"use client";

import { useMemo } from "react";
import { Dropdown } from "@/components/ui/Dropdown";

export default function ExpertsFilterBar({
  query,
  setQuery,
  expertiseFilter,
  setExpertiseFilter,
  languageFilter,
  setLanguageFilter,
  allExpertise,
  allLanguages,
}: {
  query: string;
  setQuery: (v: string) => void;
  expertiseFilter: string;
  setExpertiseFilter: (v: string) => void;
  languageFilter: string;
  setLanguageFilter: (v: string) => void;
  allExpertise: string[];
  allLanguages: string[];
}) {
  const expertiseLabel = useMemo(() => {
    if (!expertiseFilter) return "All Expertise";
    return expertiseFilter;
  }, [expertiseFilter]);

  const languageLabel = useMemo(() => {
    if (!languageFilter) return "All Languages";
    return languageFilter;
  }, [languageFilter]);

  const expertiseItems = useMemo(
    () => [
      {
        id: "",
        label: "All Expertise",
        onSelect: () => setExpertiseFilter(""),
      },
      ...allExpertise.map((area) => ({
        id: area,
        label: area,
        onSelect: () => setExpertiseFilter(area),
      })),
    ],
    [allExpertise, setExpertiseFilter],
  );

  const languageItems = useMemo(
    () => [
      {
        id: "",
        label: "All Languages",
        onSelect: () => setLanguageFilter(""),
      },
      ...allLanguages.map((lang) => ({
        id: lang,
        label: lang,
        onSelect: () => setLanguageFilter(lang),
      })),
    ],
    [allLanguages, setLanguageFilter],
  );

  return (
    <aside className="sticky [top:var(--sticky-offset)] z-40 px-4 mt-2">
      <div
        className="
          mx-auto w-full max-w-4xl
          flex flex-col sm:flex-row items-stretch sm:items-center gap-3
          rounded-2xl border border-gray-200 bg-white/90 backdrop-blur
          px-6 py-3 shadow-md hover:shadow-lg transition
        "
      >
        {/* Search */}
        <div className="flex-1 relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔎
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search experts..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Expertise Filter */}
        <div className="flex-shrink-0">
          <Dropdown
            label={expertiseLabel}
            items={expertiseItems}
            className="min-w-[160px]"
          />
        </div>

        {/* Language Filter */}
        <div className="flex-shrink-0">
          <Dropdown
            label={languageLabel}
            items={languageItems}
            className="min-w-[160px]"
          />
        </div>
      </div>
    </aside>
  );
}

