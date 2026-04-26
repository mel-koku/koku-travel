"use client";

import { useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { EXPERIENCE_TYPES } from "@/data/experienceTypes";
import { CRAFT_TYPES, type CraftTypeId } from "@/data/craftTypes";
import { REGION_ORDER, getRegionForPrefecture } from "@/data/prefectures";
import type { FilterOption } from "@/types/filters";
import type { ExperienceType } from "@/types/experience";
import type { ExperienceSortOptionId } from "@/hooks/useExperienceFilters";

const easeReveal = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

type ExperienceSortOption = {
  id: ExperienceSortOptionId;
  label: string;
};

type ExperienceFilterPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedType: ExperienceType | null;
  onTypeChange: (type: ExperienceType | null) => void;
  typeCounts: Map<string, number>;
  selectedCraftType: CraftTypeId | null;
  onCraftTypeChange: (type: CraftTypeId | null) => void;
  craftTypeCounts: Map<string, number>;
  prefectureOptions: FilterOption[];
  selectedPrefectures: string[];
  onPrefecturesChange: (prefectures: string[]) => void;
  durationOptions: { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  sortOptions: readonly ExperienceSortOption[];
  selectedSort: ExperienceSortOptionId;
  onSortChange: (sort: ExperienceSortOptionId) => void;
  resultsCount: number;
  onClearAll: () => void;
};

export function ExperienceFilterPanel({
  isOpen,
  onClose,
  selectedType,
  onTypeChange,
  typeCounts,
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
}: ExperienceFilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const typesWithCounts = EXPERIENCE_TYPES.filter((t) => (typeCounts.get(t.id) ?? 0) > 0);
  const craftTypesWithCounts = CRAFT_TYPES.filter((ct) => (craftTypeCounts.get(ct.id) ?? 0) > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-charcoal/60"
            onClick={onClose}
          />

          <m.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: easeReveal }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background border-l border-border flex flex-col"
            data-lenis-prevent
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Refine</h2>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-secondary hover:bg-surface transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Sort */}
              <FilterSection label="Sort" activeCount={selectedSort !== "recommended" ? 1 : 0} onClear={() => onSortChange("recommended")}>
                <div className="relative">
                  <select
                    value={selectedSort}
                    onChange={(e) => onSortChange(e.target.value as ExperienceSortOptionId)}
                    className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary pointer-events-none" />
                </div>
              </FilterSection>

              {/* Experience Type */}
              <FilterSection label="Type" activeCount={selectedType ? 1 : 0} onClear={() => onTypeChange(null)}>
                <div className="flex flex-wrap gap-2">
                  {typesWithCounts.map((t) => (
                    <Chip
                      key={t.id}
                      label={t.label}
                      count={typeCounts.get(t.id) ?? 0}
                      selected={selectedType === t.id}
                      onClick={() => onTypeChange(selectedType === t.id ? null : t.id)}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Craft Type */}
              {selectedType === "workshop" && craftTypesWithCounts.length > 0 && (
                <FilterSection label="Technique" activeCount={selectedCraftType ? 1 : 0} onClear={() => onCraftTypeChange(null)}>
                  <div className="flex flex-wrap gap-2">
                    {craftTypesWithCounts.map((ct) => (
                      <Chip
                        key={ct.id}
                        label={ct.label}
                        count={craftTypeCounts.get(ct.id) ?? 0}
                        selected={selectedCraftType === ct.id}
                        onClick={() => onCraftTypeChange(selectedCraftType === ct.id ? null : ct.id)}
                      />
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Prefectures */}
              <FilterSection label="Where" activeCount={selectedPrefectures.length} onClear={() => onPrefecturesChange([])}>
                <PrefectureGroupedChips
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
              </FilterSection>

              {/* Duration */}
              <FilterSection label="Duration" activeCount={selectedDuration ? 1 : 0} onClear={() => onDurationChange(null)}>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      selected={selectedDuration === opt.value}
                      onClick={() => onDurationChange(selectedDuration === opt.value ? null : opt.value)}
                    />
                  ))}
                </div>
              </FilterSection>
            </div>

            <div className="border-t border-border px-5 py-4 flex items-center justify-between gap-3">
              <button
                onClick={onClearAll}
                className="text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={onClose}
                className="h-11 rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                Show {resultsCount} {resultsCount === 1 ? "experience" : "experiences"}
              </button>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FilterSection({
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
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={onClear} className="text-xs text-foreground-secondary hover:text-foreground">
            Clear
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({
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
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
        selected
          ? "bg-brand-primary text-white font-medium"
          : "border border-border text-foreground hover:border-brand-primary/40"
      )}
    >
      {label}
      {count != null && (
        <span className={cn("text-xs tabular-nums", selected ? "text-white/70" : "text-stone")}>
          {count}
        </span>
      )}
    </button>
  );
}

function PrefectureGroupedChips({
  options,
  selected,
  onToggle,
}: {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
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
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-stone mb-1.5">{region}</p>
          <div className="flex flex-wrap gap-2">
            {grouped.get(region)!.map((option) => (
              <Chip
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
