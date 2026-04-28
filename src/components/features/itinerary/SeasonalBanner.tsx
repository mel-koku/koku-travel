"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Flower2, Leaf, Sparkles, Snowflake, X } from "lucide-react";

const SEASONAL_ICON: Record<string, LucideIcon> = {
  "cherry-blossom": Flower2,
  "plum-blossom": Flower2,
  "autumn-foliage": Leaf,
  "winter-illumination": Snowflake,
  "summer-festival": Sparkles,
};

type SeasonalBannerProps = {
  highlight: {
    id: string;
    label: string;
    description: string;
  };
};

export function SeasonalBanner({ highlight }: SeasonalBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const Icon = SEASONAL_ICON[highlight.id] ?? Sparkles;

  return (
    <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-foreground-secondary" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-xs text-foreground-secondary">
        <span className="font-medium text-foreground">{highlight.label}</span>
        {" · "}
        {highlight.description}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-0.5 text-stone transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
