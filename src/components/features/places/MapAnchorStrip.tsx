"use client";

import { cn } from "@/lib/cn";

type Props = {
  /**
   * Anchor identifier emitted by PlacesShell. Possible shapes:
   *   - "near-me"
   *   - "saved"
   *   - "city:<id>"
   *   - "pref:<id>" or "pref:<id>+<id>+..."
   *   - "category:<id>" (no spatial meaning — strip stays hidden)
   *   - "all" or undefined (strip stays hidden)
   */
  anchorKey?: string;
};

const NEAR_ME_LABEL = "Near you (5km)";
const SAVED_LABEL = "Around your saved places";

function formatToken(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function resolveLabel(anchorKey: string | undefined): string | null {
  if (!anchorKey || anchorKey === "all") return null;
  if (anchorKey === "near-me") return NEAR_ME_LABEL;
  if (anchorKey === "saved") return SAVED_LABEL;
  if (anchorKey.startsWith("city:")) {
    const city = anchorKey.slice("city:".length);
    if (!city) return null;
    return `In ${formatToken(city)}`;
  }
  if (anchorKey.startsWith("pref:")) {
    const list = anchorKey.slice("pref:".length).split("+").filter(Boolean);
    if (list.length === 0) return null;
    if (list.length === 1 && list[0]) return `In ${formatToken(list[0])} prefecture`;
    return `Across ${list.length} prefectures`;
  }
  // category-only anchors aren't spatial — leave the map untouched in copy.
  return null;
}

export function MapAnchorStrip({ anchorKey }: Props) {
  const label = resolveLabel(anchorKey);
  if (!label) return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2"
      aria-live="polite"
    >
      <span
        className={cn(
          "inline-block rounded-md bg-canvas/80 px-3 py-1 backdrop-blur-sm shadow-[var(--shadow-sm)]",
          "font-mono text-xs uppercase tracking-wide text-foreground-secondary",
        )}
      >
        {label}
      </span>
    </div>
  );
}
