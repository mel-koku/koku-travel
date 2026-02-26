import type { InterestId } from "@/types/trip";

/**
 * Vibe IDs for the trip builder wizard.
 * Vibes are aspirational categories that map to underlying interests and tags.
 */
export type VibeId =
  | "temples_tradition"
  | "foodie_paradise"
  | "nature_adventure"
  | "zen_wellness"
  | "neon_nightlife"
  | "pop_culture"
  | "local_secrets"
  | "family_fun"
  | "history_buff"
  | "in_season";

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
    id: "temples_tradition",
    name: "Temples & Tradition",
    description: "Shrines, temples, and traditional arts",
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
    id: "nature_adventure",
    name: "Nature & Adventure",
    description: "Mountains, trails, and outdoor thrills",
    icon: "Mountain",
    interests: ["nature"],
  },
  {
    id: "zen_wellness",
    name: "Zen & Wellness",
    description: "Onsen, gardens, and quiet retreats",
    icon: "Leaf",
    interests: ["wellness", "nature"],
  },
  {
    id: "neon_nightlife",
    name: "Neon & Nightlife",
    description: "City lights, bars, and entertainment",
    icon: "Sparkles",
    interests: ["nightlife", "shopping"],
  },
  {
    id: "pop_culture",
    name: "Pop Culture",
    description: "Anime, manga, quirky cafes, and themed spots",
    icon: "Gamepad2",
    interests: ["shopping", "nightlife"],
  },
  {
    id: "local_secrets",
    name: "Local Secrets",
    description: "Hidden gems and neighborhood favorites",
    icon: "Camera",
    interests: ["photography"],
  },
  {
    id: "family_fun",
    name: "Family Fun",
    description: "Aquariums, zoos, parks, and beaches",
    icon: "Smile",
    interests: ["nature"],
  },
  {
    id: "history_buff",
    name: "History & Heritage",
    description: "Museums, castles, and historic sites",
    icon: "BookOpen",
    interests: ["history", "culture"],
  },
  {
    id: "in_season",
    name: "In Season",
    description: "Places at their best right now",
    icon: "Flower2",
    interests: [],
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
