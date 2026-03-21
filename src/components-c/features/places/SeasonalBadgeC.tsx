"use client";

import { getLocationSeasonalLabel, getCurrentMonth } from "@/lib/utils/seasonUtils";

type SeasonalBadgeCProps = {
  tags: string[] | undefined | null;
};

export function SeasonalBadgeC({ tags }: SeasonalBadgeCProps) {
  const label = getLocationSeasonalLabel(tags, getCurrentMonth());
  if (!label) return null;

  return (
    <span
      className="inline-flex items-center gap-1 bg-[var(--primary)] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white"
    >
      {label}
    </span>
  );
}
