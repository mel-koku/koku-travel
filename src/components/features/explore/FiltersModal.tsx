"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CATEGORY_HIERARCHY, getSubTypesForCategories } from "@/data/categoryHierarchy";

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  culture: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  food: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  nature: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  shopping: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  view: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

type SortOptionId = "recommended" | "highest_rated" | "most_reviews" | "price_low" | "duration_short";

type SortOption = {
  id: SortOptionId;
  label: string;
};

type FiltersModalProps = {
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
  // Price filter (Google Places based: Free, $ to $$$$)
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

// Price options (0 = Free, 1-4 = $ to $$$$)
const PRICE_OPTIONS = [
  { value: 0, label: "Free" },
  { value: 1, label: "$" },
  { value: 2, label: "$$" },
  { value: 3, label: "$$$" },
  { value: 4, label: "$$$$" },
] as const;

export function FiltersModal({
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
}: FiltersModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMoreFiltersExpanded, setIsMoreFiltersExpanded] = useState(false);

  // Check if food category is selected (for showing food-specific filters)
  const isFoodCategorySelected = selectedCategories.includes("food");

  // Get available sub-types based on selected categories
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

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Remove category
      onCategoriesChange(selectedCategories.filter((c) => c !== categoryId));
      // Also remove any sub-types that belong to this category
      const categorySubTypes = CATEGORY_HIERARCHY.find((c) => c.id === categoryId)?.subTypes || [];
      const subTypeIds = categorySubTypes.map((st) => st.id);
      onSubTypesChange(selectedSubTypes.filter((st) => !subTypeIds.includes(st)));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  // Toggle sub-type selection
  const toggleSubType = (subTypeId: string) => {
    if (selectedSubTypes.includes(subTypeId)) {
      onSubTypesChange(selectedSubTypes.filter((st) => st !== subTypeId));
    } else {
      onSubTypesChange([...selectedSubTypes, subTypeId]);
    }
  };

  if (!isOpen) return null;

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

  // Toggle prefecture selection
  const togglePrefecture = (prefectureValue: string) => {
    if (selectedPrefectures.includes(prefectureValue)) {
      onPrefecturesChange(selectedPrefectures.filter((p) => p !== prefectureValue));
    } else {
      onPrefecturesChange([...selectedPrefectures, prefectureValue]);
    }
  };

  // Count of more filters that are active
  const moreFiltersActiveCount = [
    selectedDuration,
    selectedPriceLevel !== null,
    wheelchairAccessible,
    vegetarianFriendly,
  ].filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-sand transition"
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
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone"
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
              placeholder="Search destinations..."
              className="w-full rounded-full border border-border bg-background py-3 pl-12 pr-4 text-base placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            {query && (
              <button
                onClick={() => onQueryChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-sand"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Results summary */}
          <div className="flex justify-center">
            <p className="text-sm text-foreground-secondary">
              {query ? (
                <>
                  Showing <span className="font-semibold text-charcoal">{resultsCount.toLocaleString()}</span> places for &ldquo;<span className="font-medium">{query}</span>&rdquo;
                </>
              ) : (
                <>
                  <span className="font-semibold text-charcoal">{resultsCount.toLocaleString()}</span> places to explore
                </>
              )}
            </p>
          </div>

          {/* SORT BY Section */}
          <div>
            <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Sort by</h3>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  isSelected={selectedSort === option.id}
                  onClick={() => onSortChange(option.id)}
                />
              ))}
            </div>
          </div>

          {/* WHERE Section (Multi-select) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-stone uppercase tracking-wider">Where</h3>
              {selectedPrefectures.length > 0 && (
                <button
                  onClick={() => onPrefecturesChange([])}
                  className="text-xs text-stone hover:text-charcoal underline underline-offset-2"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {prefectureOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  isSelected={selectedPrefectures.includes(option.value)}
                  onClick={() => togglePrefecture(option.value)}
                />
              ))}
            </div>
          </div>

          {/* WHAT TYPE Section */}
          <div>
            <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">What type</h3>

            {/* Category buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {CATEGORY_HIERARCHY.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                const icon = CATEGORY_ICONS[category.id];

                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                      isSelected
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-border bg-background text-warm-gray hover:border-brand-primary"
                    )}
                  >
                    <span className={cn(isSelected ? "text-white" : "text-stone")}>
                      {icon}
                    </span>
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-types - shown when categories are selected */}
            {availableSubTypes.length > 0 && (
              <div className="pl-4 border-l-2 border-border">
                <p className="text-xs text-stone mb-2">Narrow down by type:</p>
                <div className="flex flex-wrap gap-2">
                  {availableSubTypes.map((subType) => (
                    <FilterChip
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

          {/* MORE FILTERS Section (Collapsible) */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setIsMoreFiltersExpanded(!isMoreFiltersExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-stone uppercase tracking-wider">
                  More filters
                </h3>
                {moreFiltersActiveCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
                    {moreFiltersActiveCount}
                  </span>
                )}
              </div>
              <svg
                className={cn(
                  "h-5 w-5 text-stone transition-transform",
                  isMoreFiltersExpanded && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isMoreFiltersExpanded && (
              <div className="mt-4 space-y-6">
                {/* Duration */}
                <div>
                  <h4 className="text-sm font-medium text-charcoal mb-2">Duration</h4>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="Any"
                      isSelected={!selectedDuration}
                      onClick={() => onDurationChange(null)}
                      size="small"
                    />
                    {durationOptions.map((option) => (
                      <FilterChip
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
                  <h4 className="text-sm font-medium text-charcoal mb-2">Price</h4>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="Any"
                      isSelected={selectedPriceLevel === null}
                      onClick={() => onPriceLevelChange(null)}
                      size="small"
                    />
                    {PRICE_OPTIONS.map((option) => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        isSelected={selectedPriceLevel === option.value}
                        onClick={() => onPriceLevelChange(selectedPriceLevel === option.value ? null : option.value)}
                        size="small"
                      />
                    ))}
                  </div>
                </div>

                {/* Accessibility */}
                <div>
                  <ToggleOption
                    label="Wheelchair accessible"
                    description="Only show places with wheelchair accessible entrance"
                    checked={wheelchairAccessible}
                    onChange={onWheelchairAccessibleChange}
                  />
                </div>

                {/* Vegetarian Friendly - Only shown when Food category is selected */}
                {isFoodCategorySelected && (
                  <div>
                    <ToggleOption
                      label="Vegetarian friendly"
                      description="Only show restaurants that serve vegetarian food"
                      checked={vegetarianFriendly}
                      onChange={onVegetarianFriendlyChange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClearAll}
            className={cn(
              "text-sm font-medium underline underline-offset-2 transition",
              hasActiveFilters
                ? "text-charcoal hover:text-warm-gray"
                : "text-stone cursor-not-allowed"
            )}
            disabled={!hasActiveFilters}
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary/90 transition"
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
  size?: "default" | "small";
};

function FilterChip({ label, isSelected, onClick, size = "default" }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border font-medium transition",
        size === "small" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        isSelected
          ? "border-brand-primary bg-brand-primary text-white"
          : "border-border bg-background text-warm-gray hover:border-brand-primary"
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
          checked ? "bg-brand-primary" : "bg-sand group-hover:bg-border"
        )}>
          <div className={cn(
            "absolute top-1 w-4 h-4 bg-background rounded-full transition-transform shadow-sm",
            checked ? "translate-x-5" : "translate-x-1"
          )} />
        </div>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-charcoal">{label}</span>
        <p className="text-xs text-stone mt-0.5">{description}</p>
      </div>
    </label>
  );
}
