"use client";

import { motion, AnimatePresence } from "framer-motion";
import { REGION_ORDER, getRegionForPrefecture } from "@/data/prefectures";
import type { PeopleSortOption } from "@/hooks/usePeopleFilters";
import type { PersonType } from "@/types/person";

const TYPE_TABS: { label: string; value: PersonType | null }[] = [
  { label: "All", value: null },
  { label: "Artisans", value: "artisan" },
  { label: "Guides", value: "guide" },
  { label: "Interpreters", value: "interpreter" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  prefectures: string[];
  languages: string[];
  selectedPrefecture: string | null;
  onPrefectureChange: (p: string | null) => void;
  selectedLanguage: string | null;
  onLanguageChange: (l: string | null) => void;
  sort: PeopleSortOption;
  onSortChange: (s: PeopleSortOption) => void;
  onClearAll: () => void;
  resultCount: number;
  activeType: PersonType | null;
  onTypeChange: (t: PersonType | null) => void;
  typeCounts: Record<PersonType, number>;
  total: number;
};

const SORT_OPTIONS: { label: string; value: PeopleSortOption }[] = [
  { label: "Recommended", value: "recommended" },
  { label: "Most experienced", value: "experience" },
  { label: "Name A-Z", value: "name" },
];

export function PeopleFilterPanelB({
  isOpen,
  onClose,
  prefectures,
  languages,
  selectedPrefecture,
  onPrefectureChange,
  selectedLanguage,
  onLanguageChange,
  sort,
  onSortChange,
  onClearAll,
  resultCount,
  activeType,
  onTypeChange,
  typeCounts,
  total,
}: Props) {
  // Group prefectures by region
  const grouped = new Map<string, string[]>();
  const ungrouped: string[] = [];

  for (const pref of prefectures) {
    const region = getRegionForPrefecture(pref);
    if (region) {
      if (!grouped.has(region)) grouped.set(region, []);
      grouped.get(region)!.push(pref);
    } else {
      ungrouped.push(pref);
    }
  }

  const orderedRegions = REGION_ORDER.filter((r) => grouped.has(r));

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
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" data-lenis-prevent>
              {/* Type */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  Type
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TYPE_TABS.map((tab) => {
                    const count = tab.value === null ? total : typeCounts[tab.value] ?? 0;
                    return (
                      <button
                        key={tab.label}
                        type="button"
                        onClick={() => onTypeChange(tab.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          activeType === tab.value
                            ? "bg-[var(--primary)] text-white"
                            : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        {tab.label} <span className="opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
                          ? "bg-[var(--primary)] text-white"
                          : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prefecture (grouped by region) */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    Prefecture
                  </p>
                  {selectedPrefecture && (
                    <button
                      type="button"
                      onClick={() => onPrefectureChange(null)}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  {orderedRegions.map((region) => (
                    <div key={region}>
                      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-1.5">
                        {region}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {grouped.get(region)!.map((pref) => (
                          <button
                            key={pref}
                            type="button"
                            onClick={() =>
                              onPrefectureChange(
                                selectedPrefecture === pref ? null : pref,
                              )
                            }
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                              selectedPrefecture === pref
                                ? "bg-[var(--primary)] text-white"
                                : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                            }`}
                          >
                            {pref}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-1.5">
                        Other
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ungrouped.map((pref) => (
                          <button
                            key={pref}
                            type="button"
                            onClick={() =>
                              onPrefectureChange(
                                selectedPrefecture === pref ? null : pref,
                              )
                            }
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                              selectedPrefecture === pref
                                ? "bg-[var(--primary)] text-white"
                                : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                            }`}
                          >
                            {pref}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                        ? "bg-[var(--primary)] text-white"
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
                          selectedLanguage === lang ? null : lang,
                        )
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        selectedLanguage === lang
                          ? "bg-[var(--primary)] text-white"
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
