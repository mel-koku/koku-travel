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
  | "modern_japan"
  | "art_architecture"
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
    description: "Tea ceremonies, sacred gardens, and centuries-old rituals",
    icon: "Torii",
    interests: ["culture", "history"],
  },
  {
    id: "foodie_paradise",
    name: "Foodie Paradise",
    description: "Ramen counters, izakaya nights, and market mornings",
    icon: "Utensils",
    interests: ["food"],
  },
  {
    id: "nature_adventure",
    name: "Nature & Adventure",
    description: "Mountain trails, coastal walks, and volcanic landscapes",
    icon: "Mountain",
    interests: ["nature"],
  },
  {
    id: "zen_wellness",
    name: "Zen & Wellness",
    description: "Onsen towns, forest bathing, and meditative stillness",
    icon: "Leaf",
    interests: ["wellness", "nature"],
  },
  {
    id: "modern_japan",
    name: "Modern Japan",
    description: "Anime, nightlife, gaming arcades, and neon-lit streets",
    icon: "Sparkles",
    interests: ["nightlife", "shopping"],
  },
  {
    id: "art_architecture",
    name: "Art & Architecture",
    description: "Contemporary museums, design districts, and art islands",
    icon: "Frame",
    interests: ["culture", "history"],
  },
  {
    id: "local_secrets",
    name: "Off the Usual Route",
    description: "Craft workshops, quiet neighborhoods, and local favorites",
    icon: "Camera",
    interests: ["photography", "craft"],
  },
  {
    id: "family_fun",
    name: "Family Fun",
    description: "Theme parks, aquariums, hands-on workshops, and beaches",
    icon: "Smile",
    interests: ["nature"],
  },
  {
    id: "history_buff",
    name: "History & Heritage",
    description: "Samurai castles, war memorials, and ancient trade roads",
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
 * Aliases for removed vibes. Maps old vibe IDs to their replacement.
 * Used to migrate saved trips that reference deprecated vibes.
 */
export const VIBE_ALIASES: Record<string, VibeId> = {
  neon_nightlife: "modern_japan",
  pop_culture: "modern_japan",
  artisan_craft: "local_secrets",
};

/**
 * Normalize a vibe ID, resolving aliases for removed vibes.
 * Returns null for completely unknown IDs.
 */
export function normalizeVibeId(id: string): VibeId | null {
  if (isValidVibeId(id)) return id;
  return VIBE_ALIASES[id] ?? null;
}

/**
 * Normalize an array of vibe IDs, resolving aliases and deduplicating.
 * Handles saved trips with old vibe IDs like "neon_nightlife".
 */
export function normalizeVibeIds(ids: string[]): VibeId[] {
  const result = new Set<VibeId>();
  for (const id of ids) {
    const normalized = normalizeVibeId(id);
    if (normalized) result.add(normalized);
  }
  return Array.from(result);
}

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
