"use client";

import { getLocationSeasonalLabel, getCurrentMonth } from "@/lib/utils/seasonUtils";

type SeasonalBadgeProps = {
  tags: string[] | undefined | null;
};

export function SeasonalBadge({ tags }: SeasonalBadgeProps) {
  const label = getLocationSeasonalLabel(tags, getCurrentMonth());
  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-xl bg-brand-secondary/90 px-2 py-0.5 text-[10px] font-medium text-charcoal shadow-sm">
      {label}
    </span>
  );
}
