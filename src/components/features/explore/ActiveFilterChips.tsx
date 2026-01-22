"use client";

import { ActiveFilter } from "@/types/filters";

type ActiveFilterChipsProps = {
  filters: ActiveFilter[];
  resultsCount: number;
  onRemove: (filter: ActiveFilter) => void;
  onClearAll: () => void;
};

export function ActiveFilterChips({
  filters,
  resultsCount,
  onRemove,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (filters.length === 0) {
    return (
      <p className="text-sm text-gray-600 text-center">
        {resultsCount.toLocaleString()} places to explore
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm text-gray-600 mr-1">
        Showing {resultsCount.toLocaleString()} places
      </span>
      {filters.map((filter, index) => (
        <button
          key={`${filter.type}-${filter.value}-${index}`}
          onClick={() => onRemove(filter)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition group"
          aria-label={`Remove ${filter.label} filter`}
        >
          <span>{filter.label}</span>
          <svg
            className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2 transition ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
