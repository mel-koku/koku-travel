"use client";

import { cn } from "@/lib/cn";
import type { GuideType } from "@/types/guide";

type FilterOption = {
  value: GuideType;
  label: string;
  count: number;
};

type SeasonOption = {
  value: string;
  label: string;
  count: number;
};

type GuideFilterBarProps = {
  types: FilterOption[];
  selectedType: GuideType | null;
  onTypeChange: (type: GuideType | null) => void;
  totalCount: number;
  seasons?: SeasonOption[];
  selectedSeason?: string | null;
  onSeasonChange?: (season: string | null) => void;
  currentSeason?: string | null;
};

export function GuideFilterBar({
  types,
  selectedType,
  onTypeChange,
  totalCount,
  seasons,
  selectedSeason,
  onSeasonChange,
  currentSeason,
}: GuideFilterBarProps) {
  const hasSeasons = seasons && seasons.length > 0;

  return (
    <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="overflow-x-auto scrollbar-hide scroll-fade-r overscroll-contain snap-x snap-mandatory py-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex justify-center gap-1 sm:gap-2 min-w-max">
            <button
              onClick={() => onTypeChange(null)}
              className={cn(
                "snap-start px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                selectedType === null
                  ? "border-brand-primary text-foreground"
                  : "border-transparent text-stone hover:text-foreground"
              )}
            >
              All
              <span className="ml-1.5 text-xs text-stone">{totalCount}</span>
            </button>

            {types.map((type) => (
              <button
                key={type.value}
                onClick={() =>
                  onTypeChange(selectedType === type.value ? null : type.value)
                }
                className={cn(
                  "snap-start px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                  selectedType === type.value
                    ? "border-brand-primary text-foreground"
                    : "border-transparent text-stone hover:text-foreground"
                )}
              >
                {type.label}
                <span className="ml-1.5 text-xs text-stone">{type.count}</span>
              </button>
            ))}

            {/* Season divider + chips */}
            {hasSeasons && (
              <>
                <div className="mx-2 h-6 w-px bg-border/50 self-center shrink-0" />
                {seasons.map((season) => (
                  <button
                    key={season.value}
                    onClick={() =>
                      onSeasonChange?.(selectedSeason === season.value ? null : season.value)
                    }
                    className={cn(
                      "snap-start px-3.5 py-2 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                      selectedSeason === season.value
                        ? "border-brand-secondary text-foreground"
                        : season.value === currentSeason && !selectedSeason
                          ? "border-transparent text-brand-secondary hover:text-foreground"
                          : "border-transparent text-stone hover:text-foreground"
                    )}
                  >
                    {season.label}
                    <span className="ml-1.5 text-xs text-stone">{season.count}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
