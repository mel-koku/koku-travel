import type { VibeId } from "./vibes";
import { locationHasSeasonalTag, getCurrentMonth } from "@/lib/utils/seasonUtils";

export const VIBE_FILTER_MAP: Record<
  VibeId,
  {
    dbCategories: string[];
    tags?: string[];
    hiddenGemOnly?: boolean;
    seasonalMatch?: boolean;
  }
> = {
  temples_tradition: {
    dbCategories: ["shrine", "temple", "castle", "historic_site", "craft"],
    tags: ["traditional-japan", "spiritual"],
  },
  foodie_paradise: {
    dbCategories: ["restaurant", "cafe", "market"],
    tags: ["tasting"],
  },
  nature_adventure: {
    dbCategories: ["park", "nature", "beach", "viewpoint"],
    tags: ["outdoor", "adrenaline", "scenic"],
  },
  zen_wellness: {
    dbCategories: ["onsen", "garden", "wellness"],
    tags: ["zen-japan", "relaxation", "quiet"],
  },
  modern_japan: {
    dbCategories: ["bar", "entertainment", "shopping"],
    tags: ["pop-culture", "quirky-japan", "modern-japan", "evening", "late-night", "lively"],
  },
  art_architecture: {
    dbCategories: ["museum", "culture"],
    tags: ["scenic", "photo-op", "contemplative", "modern-japan"],
  },
  local_secrets: {
    dbCategories: [], // cross-category -- uses is_hidden_gem flag + tags
    tags: ["hidden", "local-favorite"],
    hiddenGemOnly: true,
  },
  family_fun: {
    dbCategories: ["aquarium", "zoo", "park", "beach", "craft"],
    tags: ["families"],
  },
  history_buff: {
    dbCategories: ["museum", "castle", "historic_site", "landmark"],
    tags: ["learning"],
  },
  in_season: {
    dbCategories: [], // cross-category -- uses seasonal tag matching
    seasonalMatch: true,
  },
};

/**
 * Convert selected vibes to category weight multipliers for scoring.
 * Used as fallback when LLM intent extraction fails.
 */
export function vibesToCategoryWeights(vibes: VibeId[]): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const vibeId of vibes) {
    const mapping = VIBE_FILTER_MAP[vibeId];
    if (mapping.dbCategories.length > 0) {
      for (const cat of mapping.dbCategories) {
        weights[cat] = Math.min(2.0, Math.max(0.5, (weights[cat] ?? 1.0) + 0.3));
      }
    }
    // local_secrets: boost craft workshops even though it's a cross-category vibe
    if (vibeId === "local_secrets") {
      weights["craft"] = Math.min(2.0, Math.max(0.5, (weights["craft"] ?? 1.0) + 0.4));
    }
  }
  return Object.keys(weights).length > 0 ? weights : {};
}

export function locationMatchesVibes(
  location: { category: string; isHiddenGem?: boolean; tags?: string[] },
  selectedVibes: VibeId[]
): boolean {
  if (selectedVibes.length === 0) return true;
  return selectedVibes.some((vibeId) => {
    const mapping = VIBE_FILTER_MAP[vibeId];
    if (mapping.hiddenGemOnly) return location.isHiddenGem === true;
    if (mapping.seasonalMatch) return locationHasSeasonalTag(location.tags, getCurrentMonth());
    // Match on category OR tags
    if (mapping.dbCategories.includes(location.category.toLowerCase())) return true;
    if (mapping.tags?.some((tag) => location.tags?.includes(tag))) return true;
    return false;
  });
}
