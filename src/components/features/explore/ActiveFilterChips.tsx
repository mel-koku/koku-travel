"use client";

import { ActiveFilter } from "@/types/filters";

type ActiveFilterChipsProps = {
  filters: ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  onClearAll: () => void;
};

export function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {filters.map((filter, index) => (
        <button
          key={`${filter.type}-${filter.value}-${index}`}
          onClick={() => onRemove(filter)}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-warm-gray hover:bg-sand transition group"
          aria-label={`Remove ${filter.label} filter`}
        >
          <span>{filter.label}</span>
          <svg
            className="h-3.5 w-3.5 text-stone group-hover:text-warm-gray transition"
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
          className="text-sm font-medium text-stone hover:text-warm-gray underline underline-offset-2 transition ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
