"use client";

import { cn } from "@/lib/cn";
import type { GuideType } from "@/types/guide";

type FilterOption = {
  value: GuideType;
  label: string;
  count: number;
};

type GuideFilterBarProps = {
  types: FilterOption[];
  selectedType: GuideType | null;
  onTypeChange: (type: GuideType | null) => void;
  totalCount: number;
};

export function GuideFilterBar({
  types,
  selectedType,
  onTypeChange,
  totalCount,
}: GuideFilterBarProps) {
  return (
    <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="overflow-x-auto scrollbar-hide scroll-fade-r overscroll-contain py-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex gap-1 sm:gap-2 min-w-max">
            <button
              onClick={() => onTypeChange(null)}
              className={cn(
                "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
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
                  "px-4 py-2.5 min-h-[44px] text-sm font-medium tracking-wide whitespace-nowrap border-b-2 transition-all",
                  selectedType === type.value
                    ? "border-brand-primary text-foreground"
                    : "border-transparent text-stone hover:text-foreground"
                )}
              >
                {type.label}
                <span className="ml-1.5 text-xs text-stone">{type.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
