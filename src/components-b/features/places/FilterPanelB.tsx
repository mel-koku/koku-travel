"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { VIBES, type VibeId } from "@/data/vibes";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const DURATION_FAST = 0.25;

type SortOptionId = "recommended" | "in_season" | "highest_rated" | "most_reviews" | "price_low" | "duration_short";

type SortOption = {
  id: SortOptionId;
  label: string;
};

type FilterPanelBProps = {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  prefectureOptions: readonly { value: string; label: string }[];
  selectedPrefectures: string[];
  onPrefecturesChange: (prefectures: string[]) => void;
  selectedVibes: VibeId[];
  onVibesChange: (vibes: VibeId[]) => void;
  selectedPriceLevel: number | null;
  onPriceLevelChange: (priceLevel: number | null) => void;
  durationOptions: readonly { value: string; label: string }[];
  selectedDuration: string | null;
  onDurationChange: (duration: string | null) => void;
  openNow: boolean;
  onOpenNowChange: (value: boolean) => void;
  wheelchairAccessible: boolean;
  onWheelchairAccessibleChange: (value: boolean) => void;
  vegetarianFriendly: boolean;
  onVegetarianFriendlyChange: (value: boolean) => void;
  resultsCount: number;
  onClearAll: () => void;
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

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: bEase } },
};

export function FilterPanelB({
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
}: FilterPanelBProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const isFoodVibeSelected = selectedVibes.includes("foodie_paradise");

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

  const sortActiveCount = selectedSort !== "recommended" ? 1 : 0;
  const whereActiveCount = selectedPrefectures.length;
  const whatActiveCount = selectedVibes.length;
  const durationActiveCount = selectedDuration ? 1 : 0;
  const priceActiveCount = selectedPriceLevel !== null ? 1 : 0;
  const togglesActiveCount = (openNow ? 1 : 0) + (wheelchairAccessible ? 1 : 0) + (vegetarianFriendly ? 1 : 0);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    document.body.style.overflow = "hidden";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [isOpen, onClose]);

  const toggleVibe = (vibeId: VibeId) => {
    if (selectedVibes.includes(vibeId)) {
      onVibesChange(selectedVibes.filter((v) => v !== vibeId));
      if (vibeId === "foodie_paradise" || vibeId === "zen_wellness") onVegetarianFriendlyChange(false);
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
          {/* Backdrop — lighter for B */}
          <motion.div
            className="fixed inset-0 z-50 bg-[var(--charcoal)]/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION_FAST, ease: bEase }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            data-lenis-prevent
            className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-[90vw] bg-white border-l border-[var(--border)] flex flex-col"
            style={{ boxShadow: "var(--shadow-depth)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DURATION_FAST, ease: bEase }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-panel-title-b"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 shrink-0">
              <h2 id="filter-panel-title-b" className="text-base font-semibold text-[var(--foreground)]">
                Refine
              </h2>
              <button
                onClick={onClose}
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface)] transition duration-300"
                aria-label="Close filters"
              >
                <svg className="h-4 w-4 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <motion.div
              className="flex-1 overflow-y-auto px-6 py-6 pb-[env(safe-area-inset-bottom)] space-y-1"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } },
              }}
            >
              {/* Search */}
              <motion.div className="relative pb-4" variants={sectionVariants}>
                <svg
                  className="absolute left-3 top-1/2 -translate-y-[calc(50%+8px)] h-4 w-4 text-[var(--muted-foreground)]"
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
                  className="w-full rounded-xl border border-[var(--border)] bg-white py-2.5 pl-10 pr-4 text-base placeholder:text-[var(--muted-foreground)] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                />
                {query && (
                  <button
                    onClick={() => onQueryChange("")}
                    title="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-[calc(50%+8px)] p-1 rounded-full hover:bg-[var(--surface)]"
                    aria-label="Clear search"
                  >
                    <svg className="h-3.5 w-3.5 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </motion.div>

              {/* Sort */}
              <FilterSectionB label="Sort by" activeCount={sortActiveCount} isExpanded={expandedSections.sort} onToggle={() => toggleSection("sort")}>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <ChipB key={option.id} label={option.label} isSelected={selectedSort === option.id} onClick={() => onSortChange(option.id)} />
                  ))}
                </div>
              </FilterSectionB>

              {/* Where */}
              <FilterSectionB label="Where" activeCount={whereActiveCount} isExpanded={expandedSections.where} onToggle={() => toggleSection("where")} onClear={whereActiveCount > 0 ? () => onPrefecturesChange([]) : undefined}>
                <div className="flex flex-wrap gap-2">
                  {prefectureOptions.map((option) => (
                    <ChipB key={option.value} label={option.label} isSelected={selectedPrefectures.includes(option.value)} onClick={() => togglePrefecture(option.value)} />
                  ))}
                </div>
              </FilterSectionB>

              {/* Vibe */}
              <FilterSectionB label="Vibe" activeCount={whatActiveCount} isExpanded={expandedSections.what} onToggle={() => toggleSection("what")}>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((vibe) => (
                    <ChipB key={vibe.id} label={vibe.name} isSelected={selectedVibes.includes(vibe.id)} onClick={() => toggleVibe(vibe.id)} />
                  ))}
                </div>
              </FilterSectionB>

              {/* Duration */}
              <FilterSectionB label="Duration" activeCount={durationActiveCount} isExpanded={expandedSections.duration} onToggle={() => toggleSection("duration")}>
                <div className="flex flex-wrap gap-2">
                  <ChipB label="Any" isSelected={!selectedDuration} onClick={() => onDurationChange(null)} size="small" />
                  {durationOptions.map((option) => (
                    <ChipB key={option.value} label={option.label} isSelected={selectedDuration === option.value} onClick={() => onDurationChange(selectedDuration === option.value ? null : option.value)} size="small" />
                  ))}
                </div>
              </FilterSectionB>

              {/* Price */}
              <FilterSectionB label="Price" activeCount={priceActiveCount} isExpanded={expandedSections.price} onToggle={() => toggleSection("price")}>
                <div className="flex flex-wrap gap-2">
                  <ChipB label="Any" isSelected={selectedPriceLevel === null} onClick={() => onPriceLevelChange(null)} size="small" />
                  {PRICE_OPTIONS.map((option) => (
                    <ChipB key={option.value} label={option.label} isSelected={selectedPriceLevel === option.value} onClick={() => onPriceLevelChange(selectedPriceLevel === option.value ? null : option.value)} size="small" />
                  ))}
                </div>
              </FilterSectionB>

              {/* Toggles */}
              <FilterSectionB label="Accessibility" activeCount={togglesActiveCount} isExpanded={expandedSections.toggles} onToggle={() => toggleSection("toggles")}>
                <div className="space-y-4">
                  <ToggleB label="Open now" description="Only show places currently open" checked={openNow} onChange={onOpenNowChange} />
                  <ToggleB label="Wheelchair accessible" description="Places with a wheelchair-accessible entrance" checked={wheelchairAccessible} onChange={onWheelchairAccessibleChange} />
                  {isFoodVibeSelected && (
                    <ToggleB label="Vegetarian friendly" description="Restaurants with vegetarian options" checked={vegetarianFriendly} onChange={onVegetarianFriendlyChange} />
                  )}
                </div>
              </FilterSectionB>
            </motion.div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] px-6 py-4 flex items-center justify-between shrink-0">
              <button
                onClick={onClearAll}
                className={cn(
                  "text-sm font-medium underline underline-offset-2 transition",
                  hasActiveFilters
                    ? "text-[var(--foreground)] hover:text-[var(--muted-foreground)]"
                    : "text-[var(--muted-foreground)] cursor-not-allowed",
                )}
                disabled={!hasActiveFilters}
              >
                Clear all
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-secondary)] active:scale-[0.98]"
                style={{ boxShadow: "var(--shadow-sm)" }}
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

/* ── Sub-components ────────────────────────────────────────────── */

type FilterSectionBProps = {
  label: string;
  activeCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onClear?: () => void;
  children: React.ReactNode;
};

function FilterSectionB({ label, activeCount, isExpanded, onToggle, onClear, children }: FilterSectionBProps) {
  return (
    <motion.div className="border-b border-[var(--border)]/50 last:border-b-0" variants={sectionVariants}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-3.5 group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider group-hover:text-[var(--foreground)] transition">
            {label}
          </h3>
          {activeCount > 0 && !isExpanded && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClear && isExpanded && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onClear(); } }}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2"
            >
              Clear
            </span>
          )}
          <svg
            className={cn(
              "h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200",
              isExpanded && "rotate-180",
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
            transition={{ duration: DURATION_FAST, ease: bEase }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type ChipBProps = {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  size?: "default" | "small";
};

function ChipB({ label, isSelected, onClick, size = "default" }: ChipBProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border font-medium transition",
        size === "small" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        isSelected
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]",
      )}
    >
      {label}
    </button>
  );
}

type ToggleBProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleB({ label, description, checked, onChange }: ToggleBProps) {
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
          checked ? "bg-[var(--primary)]" : "bg-[var(--surface)] group-hover:bg-[var(--border)]",
        )}>
          <div className={cn(
            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-[var(--shadow-sm)]",
            checked ? "translate-x-5" : "translate-x-1",
          )} />
        </div>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{description}</p>
      </div>
    </label>
  );
}
