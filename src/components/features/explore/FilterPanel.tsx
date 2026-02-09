"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { CATEGORY_HIERARCHY, getSubTypesForCategories } from "@/data/categoryHierarchy";

type SortOptionId = "recommended" | "highest_rated" | "most_reviews" | "price_low" | "duration_short";

type SortOption = {
  id: SortOptionId;
  label: string;
};

type FilterPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  // Search
  query: string;
  onQueryChange: (value: string) => void;
  // Prefecture filter (multi-select)
  prefectureOptions: readonly { value: string; label: string }[];
  selectedPrefectures: string[];
  onPrefecturesChange: (prefectures: string[]) => void;
  // Category filter
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  // Sub-type filter
  selectedSubTypes: string[];
  onSubTypesChange: (subTypes: string[]) => void;
  // Price filter
  selectedPriceLevel: number | null;
  onPriceLevelChange: (priceLevel: number | null) => void;
  // Duration filter
  durationOptions: readonly { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  // Accessibility filter
  wheelchairAccessible: boolean;
  onWheelchairAccessibleChange: (value: boolean) => void;
  // Dietary filter
  vegetarianFriendly: boolean;
  onVegetarianFriendlyChange: (value: boolean) => void;
  // Results count
  resultsCount: number;
  // Clear all
  onClearAll: () => void;
  // Sort options
  sortOptions: readonly SortOption[];
  selectedSort: SortOptionId;
  onSortChange: (sort: SortOptionId) => void;
};

const PRICE_OPTIONS = [
  { value: 0, label: "Free" },
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
] as const;

export function FilterPanel({
  isOpen,
  onClose,
  query,
  onQueryChange,
  prefectureOptions,
  selectedPrefectures,
  onPrefecturesChange,
  selectedCategories,
  onCategoriesChange,
  selectedSubTypes,
  onSubTypesChange,
  selectedPriceLevel,
  onPriceLevelChange,
  durationOptions,
  selectedDuration,
  onDurationChange,
  wheelchairAccessible,
  onWheelchairAccessibleChange,
  vegetarianFriendly,
  onVegetarianFriendlyChange,
  resultsCount,
  onClearAll,
  sortOptions,
  selectedSort,
  onSortChange,
}: FilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const isFoodCategorySelected = selectedCategories.includes("food");
  const availableSubTypes = getSubTypesForCategories(selectedCategories);

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

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== categoryId));
      const categorySubTypes = CATEGORY_HIERARCHY.find((c) => c.id === categoryId)?.subTypes || [];
      const subTypeIds = categorySubTypes.map((st) => st.id);
      onSubTypesChange(selectedSubTypes.filter((st) => !subTypeIds.includes(st)));
      if (categoryId === "food") {
        onVegetarianFriendlyChange(false);
      }
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const toggleSubType = (subTypeId: string) => {
    if (selectedSubTypes.includes(subTypeId)) {
      onSubTypesChange(selectedSubTypes.filter((st) => st !== subTypeId));
    } else {
      onSubTypesChange([...selectedSubTypes, subTypeId]);
    }
  };

  const togglePrefecture = (prefectureValue: string) => {
    if (selectedPrefectures.includes(prefectureValue)) {
      onPrefecturesChange(selectedPrefectures.filter((p) => p !== prefectureValue));
    } else {
      onPrefecturesChange([...selectedPrefectures, prefectureValue]);
    }
  };

  const hasActiveFilters =
    query ||
    selectedPrefectures.length > 0 ||
    selectedCategories.length > 0 ||
    selectedSubTypes.length > 0 ||
    selectedPriceLevel !== null ||
    selectedDuration ||
    wheelchairAccessible ||
    vegetarianFriendly ||
    selectedSort !== "recommended";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            data-lenis-prevent
            className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-[90vw] bg-background border-l border-border flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-panel-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <h2 id="filter-panel-title" className="text-base font-semibold text-foreground">
                Refine
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface transition"
                aria-label="Close filters"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone"
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
                  placeholder="Search places..."
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                {query && (
                  <button
                    onClick={() => onQueryChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface"
                    aria-label="Clear search"
                  >
                    <svg className="h-3.5 w-3.5 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Sort by */}
              <div>
                <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Sort by</h3>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <PanelChip
                      key={option.id}
                      label={option.label}
                      isSelected={selectedSort === option.id}
                      onClick={() => onSortChange(option.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Where */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-stone uppercase tracking-wider">Where</h3>
                  {selectedPrefectures.length > 0 && (
                    <button
                      onClick={() => onPrefecturesChange([])}
                      className="text-xs text-stone hover:text-foreground underline underline-offset-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {prefectureOptions.map((option) => (
                    <PanelChip
                      key={option.value}
                      label={option.label}
                      isSelected={selectedPrefectures.includes(option.value)}
                      onClick={() => togglePrefecture(option.value)}
                    />
                  ))}
                </div>
              </div>

              {/* What type */}
              <div>
                <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">What type</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CATEGORY_HIERARCHY.map((category) => (
                    <PanelChip
                      key={category.id}
                      label={category.label}
                      isSelected={selectedCategories.includes(category.id)}
                      onClick={() => toggleCategory(category.id)}
                    />
                  ))}
                </div>

                {availableSubTypes.length > 0 && (
                  <div className="bg-surface/50 p-3 rounded-xl">
                    <p className="text-xs text-stone mb-2">Narrow down:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSubTypes.map((subType) => (
                        <PanelChip
                          key={subType.id}
                          label={subType.label}
                          isSelected={selectedSubTypes.includes(subType.id)}
                          onClick={() => toggleSubType(subType.id)}
                          size="small"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div>
                <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Duration</h3>
                <div className="flex flex-wrap gap-2">
                  <PanelChip
                    label="Any"
                    isSelected={!selectedDuration}
                    onClick={() => onDurationChange(null)}
                    size="small"
                  />
                  {durationOptions.map((option) => (
                    <PanelChip
                      key={option.value}
                      label={option.label}
                      isSelected={selectedDuration === option.value}
                      onClick={() => onDurationChange(selectedDuration === option.value ? null : option.value)}
                      size="small"
                    />
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Price</h3>
                <div className="flex flex-wrap gap-2">
                  <PanelChip
                    label="Any"
                    isSelected={selectedPriceLevel === null}
                    onClick={() => onPriceLevelChange(null)}
                    size="small"
                  />
                  {PRICE_OPTIONS.map((option) => (
                    <PanelChip
                      key={option.value}
                      label={option.label}
                      isSelected={selectedPriceLevel === option.value}
                      onClick={() => onPriceLevelChange(selectedPriceLevel === option.value ? null : option.value)}
                      size="small"
                    />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <ToggleOption
                  label="Wheelchair accessible"
                  description="Only show places with wheelchair accessible entrance"
                  checked={wheelchairAccessible}
                  onChange={onWheelchairAccessibleChange}
                />

                {isFoodCategorySelected && (
                  <ToggleOption
                    label="Vegetarian friendly"
                    description="Only show restaurants that serve vegetarian food"
                    checked={vegetarianFriendly}
                    onChange={onVegetarianFriendlyChange}
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
              <button
                onClick={onClearAll}
                className={cn(
                  "text-sm font-medium underline underline-offset-2 transition",
                  hasActiveFilters
                    ? "text-foreground hover:text-foreground-secondary"
                    : "text-stone cursor-not-allowed"
                )}
                disabled={!hasActiveFilters}
              >
                Clear all
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary/90 transition"
              >
                Show {resultsCount.toLocaleString()} places
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type PanelChipProps = {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  size?: "default" | "small";
};

function PanelChip({ label, isSelected, onClick, size = "default" }: PanelChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border font-medium transition",
        size === "small" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        isSelected
          ? "border-brand-primary bg-brand-primary text-white"
          : "border-border bg-background text-foreground-secondary hover:border-brand-primary"
      )}
    >
      {label}
    </button>
  );
}

type ToggleOptionProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={cn(
          "w-10 h-6 rounded-full transition-colors",
          checked ? "bg-brand-primary" : "bg-surface group-hover:bg-border"
        )}>
          <div className={cn(
            "absolute top-1 w-4 h-4 bg-background rounded-full transition-transform shadow-sm",
            checked ? "translate-x-5" : "translate-x-1"
          )} />
        </div>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <p className="text-xs text-stone mt-0.5">{description}</p>
      </div>
    </label>
  );
}
