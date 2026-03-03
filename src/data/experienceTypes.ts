/**
 * Experience type taxonomy for the unified /experiences page.
 * Maps experience_type column values to display labels, colors, and icons.
 */

import type { ExperienceType } from "@/types/experience";

export type ExperienceTypeDefinition = {
  id: ExperienceType;
  label: string;
  color: string;
  /** Lucide icon name */
  icon: string;
};

export const EXPERIENCE_TYPES: readonly ExperienceTypeDefinition[] = [
  {
    id: "workshop",
    label: "Workshop",
    color: "#6366f1",
    icon: "Hammer",
  },
  {
    id: "tour",
    label: "Tour",
    color: "#3B82F6",
    icon: "Map",
  },
  {
    id: "cruise",
    label: "Cruise",
    color: "#0EA5E9",
    icon: "Ship",
  },
  {
    id: "experience",
    label: "Cultural",
    color: "#A855F7",
    icon: "Sparkles",
  },
  {
    id: "adventure",
    label: "Adventure",
    color: "#F97316",
    icon: "Mountain",
  },
  {
    id: "rental",
    label: "Rental",
    color: "#10B981",
    icon: "Key",
  },
] as const;

export function getExperienceTypeLabel(type: string): string {
  const def = EXPERIENCE_TYPES.find((t) => t.id === type);
  return def?.label ?? "Experience";
}

export function getExperienceTypeColor(type: string): string {
  const def = EXPERIENCE_TYPES.find((t) => t.id === type);
  return def?.color ?? "#A855F7";
}
