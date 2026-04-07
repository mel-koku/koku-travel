import {
  BookOpen,
  Camera,
  Flower2,
  Frame,
  Gamepad2,
  Leaf,
  Mountain,
  Smile,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/** Custom Torii icon since Lucide does not have one. */
export function ToriiIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 5h16" />
      <path d="M6 5v16" />
      <path d="M18 5v16" />
      <path d="M2 8h20" />
      <path d="M9 8v13" />
      <path d="M15 8v13" />
    </svg>
  );
}

/**
 * Shared map from vibe icon string (as defined in vibes.ts) to the
 * corresponding Lucide component (or custom SVG). A single source of truth
 * consumed by both VibeSelector and any other UI that renders vibe icons.
 *
 * Unmapped icon strings silently fall back to Mountain at the call site.
 */
export const VIBE_ICON_MAP: Record<string, LucideIcon | typeof ToriiIcon> = {
  Torii: ToriiIcon,
  Utensils: Utensils,
  Camera: Camera,
  Sparkles: Sparkles,
  Mountain: Mountain,
  Leaf: Leaf,
  Frame: Frame,
  Flower2: Flower2,
  Gamepad2: Gamepad2,
  Smile: Smile,
  BookOpen: BookOpen,
};

/** Fallback icon used when a vibe's icon string has no entry in the map. */
export const VIBE_ICON_FALLBACK = Mountain;
