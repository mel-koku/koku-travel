"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { CRAFT_TYPES, type CraftTypeId } from "@/data/craftTypes";
import { REGION_ORDER, getRegionForPrefecture } from "@/data/prefectures";
import type { FilterOption, ActiveFilter } from "@/types/filters";
import type { CraftSortOptionId } from "@/hooks/useCraftFilters";
import { bEase } from "@/lib/variant-b-motion";


type CraftSortOption = {
  id: CraftSortOptionId;
  label: string;
};

type CraftFilterPanelBProps = {
  isOpen: boolean;
  onClose: () => void;
  // Craft type
  selectedCraftType: CraftTypeId | null;
  onCraftTypeChange: (type: CraftTypeId | null) => void;
  craftTypeCounts: Map<string, number>;
  // Prefectures
  prefectureOptions: FilterOption[];
  selectedPrefectures: string[];
  onPrefecturesChange: (prefectures: string[]) => void;
  // Duration
  durationOptions: { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  // Sort
  sortOptions: readonly CraftSortOption[];
  selectedSort: CraftSortOptionId;
  onSortChange: (sort: CraftSortOptionId) => void;
  // Results
  resultsCount: number;
  onClearAll: () => void;
  // Active filter chips
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (filter: ActiveFilter) => void;
};

export function CraftFilterPanelB({
  isOpen,
  onClose,
  selectedCraftType,
  onCraftTypeChange,
  craftTypeCounts,
  prefectureOptions,
  selectedPrefectures,
  onPrefecturesChange,
  durationOptions,
  selectedDuration,
  onDurationChange,
  sortOptions,
  selectedSort,
  onSortChange,
  resultsCount,
  onClearAll,
  activeFilters = [],
  onRemoveFilter,
}: CraftFilterPanelBProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Trap scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const craftTypesWithCounts = CRAFT_TYPES.filter((ct) => (craftTypeCounts.get(ct.id) ?? 0) > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-charcoal/40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: bEase }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[var(--background)] shadow-[var(--shadow-elevated)] flex flex-col"
            data-lenis-prevent
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--foreground)]">Refine</h2>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--surface)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Active filter chips */}
            {activeFilters.filter((f) => f.type !== "search").length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-3">
                {activeFilters
                  .filter((f) => f.type !== "search")
                  .map((filter, index) => (
                    <button
                      key={`${filter.type}-${filter.value}-${index}`}
                      onClick={() => onRemoveFilter?.(filter)}
                      title={`Remove ${filter.label}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-secondary)] hover:bg-[var(--border)] border border-[var(--border)] transition group"
                      aria-label={`Remove ${filter.label} filter`}
                    >
                      <span>{filter.label}</span>
                      <svg
                        className="h-3 w-3 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ))}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Sort */}
              <FilterSectionB label="Sort" activeCount={selectedSort !== "recommended" ? 1 : 0} onClear={() => onSortChange("recommended")}>
                <div className="relative">
                  <select
                    value={selectedSort}
                    onChange={(e) => onSortChange(e.target.value as CraftSortOptionId)}
                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 pr-8 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                </div>
              </FilterSectionB>

              {/* Craft Type */}
              <FilterSectionB label="Technique" activeCount={selectedCraftType ? 1 : 0} onClear={() => onCraftTypeChange(null)}>
                <div className="flex flex-wrap gap-2">
                  {craftTypesWithCounts.map((ct) => (
                    <ChipB
                      key={ct.id}
                      label={ct.label}
                      count={craftTypeCounts.get(ct.id) ?? 0}
                      selected={selectedCraftType === ct.id}
                      onClick={() => onCraftTypeChange(selectedCraftType === ct.id ? null : ct.id)}
                    />
                  ))}
                </div>
              </FilterSectionB>

              {/* Prefectures */}
              <FilterSectionB label="Where" activeCount={selectedPrefectures.length} onClear={() => onPrefecturesChange([])}>
                <PrefectureGroupedChipsB
                  options={prefectureOptions}
                  selected={selectedPrefectures}
                  onToggle={(val) => {
                    onPrefecturesChange(
                      selectedPrefectures.includes(val)
                        ? selectedPrefectures.filter((p) => p !== val)
                        : [...selectedPrefectures, val]
                    );
                  }}
                />
              </FilterSectionB>

              {/* Duration */}
              <FilterSectionB label="Duration" activeCount={selectedDuration ? 1 : 0} onClear={() => onDurationChange(null)}>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map((opt) => (
                    <ChipB
                      key={opt.value}
                      label={opt.label}
                      selected={selectedDuration === opt.value}
                      onClick={() => onDurationChange(selectedDuration === opt.value ? null : opt.value)}
                    />
                  ))}
                </div>
              </FilterSectionB>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] px-5 py-4 flex items-center justify-between gap-3">
              <button
                onClick={onClearAll}
                className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={onClose}
                className="h-11 rounded-xl bg-[var(--primary)] px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Show {resultsCount} {resultsCount === 1 ? "workshop" : "workshops"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function FilterSectionB({
  label,
  activeCount,
  onClear,
  children,
}: {
  label: string;
  activeCount: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Clear
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ChipB({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors",
        selected
          ? "bg-[var(--primary)] text-white font-medium"
          : "border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/40"
      )}
    >
      {label}
      {count != null && (
        <span className={cn("text-xs tabular-nums", selected ? "text-white/70" : "text-[var(--muted-foreground)]")}>
          {count}
        </span>
      )}
    </button>
  );
}

function PrefectureGroupedChipsB({
  options,
  selected,
  onToggle,
}: {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  // Group prefectures by region
  const grouped = new Map<string, FilterOption[]>();
  const other: FilterOption[] = [];

  for (const opt of options) {
    const region = getRegionForPrefecture(opt.value);
    if (region) {
      const list = grouped.get(region) ?? [];
      list.push(opt);
      grouped.set(region, list);
    } else {
      other.push(opt);
    }
  }

  if (other.length > 0) {
    grouped.set("Other", other);
  }

  const orderedRegions = REGION_ORDER.filter((r) => grouped.has(r));

  return (
    <div className="space-y-3">
      {orderedRegions.map((region) => (
        <div key={region}>
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-1.5">{region}</p>
          <div className="flex flex-wrap gap-2">
            {grouped.get(region)!.map((option) => (
              <ChipB
                key={option.value}
                label={option.label}
                count={option.count}
                selected={selected.includes(option.value)}
                onClick={() => onToggle(option.value)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
