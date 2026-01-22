"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type FiltersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Search
  query: string;
  onQueryChange: (value: string) => void;
  // Prefecture filter
  prefectureOptions: readonly { value: string; label: string }[];
  selectedPrefecture: string | null;
  onPrefectureChange: (prefecture: string | null) => void;
  // Budget filter
  budgetOptions: readonly { value: string; label: string }[];
  selectedBudget: string | null;
  onBudgetChange: (budget: string | null) => void;
  // Duration filter
  durationOptions: readonly { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  // Tag filter
  tagOptions: readonly { value: string; label: string }[];
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  // Results count
  resultsCount: number;
  // Clear all
  onClearAll: () => void;
};

export function FiltersModal({
  isOpen,
  onClose,
  query,
  onQueryChange,
  prefectureOptions,
  selectedPrefecture,
  onPrefectureChange,
  budgetOptions,
  selectedBudget,
  onBudgetChange,
  durationOptions,
  selectedDuration,
  onDurationChange,
  tagOptions,
  selectedTag,
  onTagChange,
  resultsCount,
  onClearAll,
}: FiltersModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const hasActiveFilters = query || selectedPrefecture || selectedBudget || selectedDuration || selectedTag;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition"
            aria-label="Close filters"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 id="filters-title" className="text-base font-semibold">
            Filters
          </h2>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Search */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Search</h3>
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search by name, city, or prefecture..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-base placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              {query && (
                <button
                  onClick={() => onQueryChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Prefecture */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Prefecture</h3>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All prefectures"
                isSelected={!selectedPrefecture}
                onClick={() => onPrefectureChange(null)}
              />
              {prefectureOptions.slice(0, 12).map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  isSelected={selectedPrefecture === option.value}
                  onClick={() => onPrefectureChange(selectedPrefecture === option.value ? null : option.value)}
                />
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Budget</h3>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All budgets"
                isSelected={!selectedBudget}
                onClick={() => onBudgetChange(null)}
              />
              {budgetOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  isSelected={selectedBudget === option.value}
                  onClick={() => onBudgetChange(selectedBudget === option.value ? null : option.value)}
                />
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Duration</h3>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Any duration"
                isSelected={!selectedDuration}
                onClick={() => onDurationChange(null)}
              />
              {durationOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  isSelected={selectedDuration === option.value}
                  onClick={() => onDurationChange(selectedDuration === option.value ? null : option.value)}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Experience Type</h3>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All types"
                isSelected={!selectedTag}
                onClick={() => onTagChange(null)}
              />
              {tagOptions.slice(0, 15).map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  isSelected={selectedTag === option.value}
                  onClick={() => onTagChange(selectedTag === option.value ? null : option.value)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClearAll}
            className={cn(
              "text-sm font-medium underline underline-offset-2 transition",
              hasActiveFilters
                ? "text-gray-900 hover:text-gray-600"
                : "text-gray-400 cursor-not-allowed"
            )}
            disabled={!hasActiveFilters}
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition"
          >
            Show {resultsCount.toLocaleString()} places
          </button>
        </div>
      </div>
    </div>
  );
}

type FilterChipProps = {
  label: string;
  isSelected: boolean;
  onClick: () => void;
};

function FilterChip({ label, isSelected, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        isSelected
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:border-gray-900"
      )}
    >
      {label}
    </button>
  );
}
