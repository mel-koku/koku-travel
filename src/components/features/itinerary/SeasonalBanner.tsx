"use client";

import { useState } from "react";
import { X } from "lucide-react";

const SEASONAL_EMOJI: Record<string, string> = {
  "cherry-blossom": "🌸",
  "plum-blossom": "🌺",
  "autumn-foliage": "🍁",
  "winter-illumination": "✨",
  "summer-festival": "🎆",
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

  const emoji = SEASONAL_EMOJI[highlight.id] ?? "🗾";

  return (
    <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5">
      <span className="shrink-0 text-sm">{emoji}</span>
      <p className="min-w-0 flex-1 truncate text-xs text-foreground-secondary">
        <span className="font-medium text-foreground">{highlight.label}</span>
        {" \u00B7 "}
        {highlight.description}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-stone transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
