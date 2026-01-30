import type { InterestId } from "@/types/trip";

/**
 * Vibe IDs for the trip builder wizard.
 * Vibes are aspirational categories that map to underlying interests.
 */
export type VibeId =
  | "cultural_heritage"
  | "foodie_paradise"
  | "hidden_gems"
  | "neon_nightlife"
  | "nature_adventure";

/**
 * Vibe definition with display metadata and interest mapping.
 */
export type VibeDefinition = {
  id: VibeId;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  interests: InterestId[];
};

/**
 * All vibe categories with their mappings to underlying interests.
 * Order determines display order in the UI.
 */
export const VIBES: readonly VibeDefinition[] = [
  {
    id: "cultural_heritage",
    name: "Cultural Heritage",
    description: "Temples, shrines, and traditional arts",
    icon: "Torii",
    interests: ["culture", "history"],
  },
  {
    id: "foodie_paradise",
    name: "Foodie Paradise",
    description: "Ramen, sushi, izakayas, and street food",
    icon: "Utensils",
    interests: ["food"],
  },
  {
    id: "hidden_gems",
    name: "Hidden Gems",
    description: "Off-the-beaten-path spots and photo ops",
    icon: "Camera",
    interests: ["photography"],
  },
  {
    id: "neon_nightlife",
    name: "Neon & Nightlife",
    description: "City lights, shopping, and entertainment",
    icon: "Sparkles",
    interests: ["nightlife", "shopping"],
  },
  {
    id: "nature_adventure",
    name: "Nature & Adventure",
    description: "Mountains, gardens, and outdoor wellness",
    icon: "Mountain",
    interests: ["nature", "wellness"],
  },
] as const;

/**
 * Maximum number of vibes a user can select.
 */
export const MAX_VIBE_SELECTION = 3;

/**
 * Convert selected vibes to their underlying interest IDs.
 * Used for backward compatibility with existing cityRelevance calculations.
 *
 * @param vibeIds - Array of selected vibe IDs
 * @returns Array of unique interest IDs
 */
export function vibesToInterests(vibeIds: VibeId[]): InterestId[] {
  const interestSet = new Set<InterestId>();

  for (const vibeId of vibeIds) {
    const vibe = VIBES.find((v) => v.id === vibeId);
    if (vibe) {
      for (const interest of vibe.interests) {
        interestSet.add(interest);
      }
    }
  }

  return Array.from(interestSet);
}

/**
 * Get a vibe definition by its ID.
 */
export function getVibeById(vibeId: VibeId): VibeDefinition | undefined {
  return VIBES.find((v) => v.id === vibeId);
}

/**
 * Check if a string is a valid vibe ID.
 */
export function isValidVibeId(id: string): id is VibeId {
  return VIBES.some((v) => v.id === id);
}
