"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { easeReveal, durationFast } from "@/lib/motion";
import { VIBES, type VibeId } from "@/data/vibes";

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
  // Vibe filter
  selectedVibes: VibeId[];
  onVibesChange: (vibes: VibeId[]) => void;
  // Price filter
  selectedPriceLevel: number | null;
  onPriceLevelChange: (priceLevel: number | null) => void;
  // Duration filter
  durationOptions: readonly { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  // Open Now filter
  openNow: boolean;
  onOpenNowChange: (value: boolean) => void;
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
  selectedVibes,
  onVibesChange,
  selectedPriceLevel,
  onPriceLevelChange,
  durationOptions,
  selectedDuration,
  onDurationChange,
  openNow,
  onOpenNowChange,
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

  const isFoodVibeSelected = selectedVibes.includes("foodie_paradise");

  // Section expand/collapse state
  const [expandedSections, setExpandedSections] = useState({
    sort: true,
    where: false,
    what: true,
    duration: false,
    price: false,
    toggles: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Active filter counts for badges
  const sortActiveCount = selectedSort !== "recommended" ? 1 : 0;
  const whereActiveCount = selectedPrefectures.length;
  const whatActiveCount = selectedVibes.length;
  const durationActiveCount = selectedDuration ? 1 : 0;
  const priceActiveCount = selectedPriceLevel !== null ? 1 : 0;
  const togglesActiveCount = (openNow ? 1 : 0) + (wheelchairAccessible ? 1 : 0) + (vegetarianFriendly ? 1 : 0);

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

  const toggleVibe = (vibeId: VibeId) => {
    if (selectedVibes.includes(vibeId)) {
      onVibesChange(selectedVibes.filter((v) => v !== vibeId));
      if (vibeId === "foodie_paradise") {
        onVegetarianFriendlyChange(false);
      }
    } else {
      onVibesChange([...selectedVibes, vibeId]);
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
    selectedVibes.length > 0 ||
    selectedPriceLevel !== null ||
    selectedDuration ||
    openNow ||
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
            transition={{ duration: durationFast, ease: easeReveal }}
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
            transition={{ duration: durationFast, ease: easeReveal }}
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
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface transition duration-300"
                aria-label="Close filters"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content — sections stagger in after panel settles */}
            <motion.div
              className="flex-1 overflow-y-auto px-6 py-6 pb-[env(safe-area-inset-bottom)] space-y-1"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } },
              }}
            >
              {/* Search — always visible */}
              <motion.div className="relative pb-4" variants={sectionVariants}>
                <svg
                  className="absolute left-3 top-1/2 -translate-y-[calc(50%+8px)] h-4 w-4 text-stone"
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
                  placeholder="Search by name, city, or region..."
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-base placeholder:text-stone focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                {query && (
                  <button
                    onClick={() => onQueryChange("")}
                    className="absolute right-3 top-1/2 -translate-y-[calc(50%+8px)] p-1 rounded-full hover:bg-surface"
                    aria-label="Clear search"
                  >
                    <svg className="h-3.5 w-3.5 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </motion.div>

              {/* Sort by */}
              <FilterSection
                label="Sort by"
                activeCount={sortActiveCount}
                isExpanded={expandedSections.sort}
                onToggle={() => toggleSection("sort")}
              >
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
              </FilterSection>

              {/* Where */}
              <FilterSection
                label="Where"
                activeCount={whereActiveCount}
                isExpanded={expandedSections.where}
                onToggle={() => toggleSection("where")}
                onClear={whereActiveCount > 0 ? () => onPrefecturesChange([]) : undefined}
              >
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
              </FilterSection>

              {/* Vibe */}
              <FilterSection
                label="Vibe"
                activeCount={whatActiveCount}
                isExpanded={expandedSections.what}
                onToggle={() => toggleSection("what")}
              >
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((vibe) => (
                    <PanelChip
                      key={vibe.id}
                      label={vibe.name}
                      isSelected={selectedVibes.includes(vibe.id)}
                      onClick={() => toggleVibe(vibe.id)}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Duration */}
              <FilterSection
                label="Duration"
                activeCount={durationActiveCount}
                isExpanded={expandedSections.duration}
                onToggle={() => toggleSection("duration")}
              >
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
              </FilterSection>

              {/* Price */}
              <FilterSection
                label="Price"
                activeCount={priceActiveCount}
                isExpanded={expandedSections.price}
                onToggle={() => toggleSection("price")}
              >
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
              </FilterSection>

              {/* Toggles */}
              <FilterSection
                label="Accessibility"
                activeCount={togglesActiveCount}
                isExpanded={expandedSections.toggles}
                onToggle={() => toggleSection("toggles")}
              >
                <div className="space-y-4">
                  <ToggleOption
                    label="Open now"
                    description="Only show places currently open"
                    checked={openNow}
                    onChange={onOpenNowChange}
                  />

                  <ToggleOption
                    label="Wheelchair accessible"
                    description="Places with a wheelchair-accessible entrance"
                    checked={wheelchairAccessible}
                    onChange={onWheelchairAccessibleChange}
                  />

                  {isFoodVibeSelected && (
                    <ToggleOption
                      label="Vegetarian friendly"
                      description="Restaurants with vegetarian options"
                      checked={vegetarianFriendly}
                      onChange={onVegetarianFriendlyChange}
                    />
                  )}
                </div>
              </FilterSection>
            </motion.div>

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
              <Button
                variant="primary"
                size="lg"
                onClick={onClose}
              >
                Show {resultsCount.toLocaleString()} places
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type FilterSectionProps = {
  label: string;
  activeCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onClear?: () => void;
  children: React.ReactNode;
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeReveal } },
};

function FilterSection({ label, activeCount, isExpanded, onToggle, onClear, children }: FilterSectionProps) {
  return (
    <motion.div className="border-b border-border/50 last:border-b-0" variants={sectionVariants}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-3.5 group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-stone uppercase tracking-wider group-hover:text-foreground-secondary transition">
            {label}
          </h3>
          {activeCount > 0 && !isExpanded && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-brand-primary text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClear && isExpanded && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onClear();
                }
              }}
              className="text-xs text-stone hover:text-foreground underline underline-offset-2"
            >
              Clear
            </span>
          )}
          <svg
            className={cn(
              "h-4 w-4 text-stone transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: durationFast, ease: easeReveal }}
            className="overflow-hidden"
          >
            <div className="pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
