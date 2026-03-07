"use client";

import { getLocationSeasonalLabel, getCurrentMonth } from "@/lib/utils/seasonUtils";

type SeasonalBadgeBProps = {
  tags: string[] | undefined | null;
};

export function SeasonalBadgeB({ tags }: SeasonalBadgeBProps) {
  const label = getLocationSeasonalLabel(tags, getCurrentMonth());
  if (!label) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold shadow-[var(--shadow-sm)]"
      style={{
        color: "var(--primary)",
      }}
    >
      {label}
    </span>
  );
}
