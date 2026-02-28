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

type SeasonalBannerBProps = {
  highlight: {
    id: string;
    label: string;
    description: string;
  };
};

export function SeasonalBannerB({ highlight }: SeasonalBannerBProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const emoji = SEASONAL_EMOJI[highlight.id] ?? "🗾";

  return (
    <div
      className="mx-4 mb-3 flex items-center gap-3 rounded-2xl px-4 py-2.5"
      style={{
        backgroundColor: "color-mix(in srgb, var(--warning) 8%, transparent)",
      }}
    >
      <span className="shrink-0 text-lg">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-medium uppercase tracking-[0.15em]"
          style={{ color: "var(--warning)" }}
        >
          {highlight.label}
        </p>
        <p
          className="mt-0.5 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {highlight.description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-lg p-1 transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
