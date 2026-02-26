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
    dbCategories: ["shrine", "temple", "castle", "historic_site"],
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
  neon_nightlife: {
    dbCategories: ["bar", "entertainment"],
    tags: ["evening", "late-night", "lively", "modern-japan"],
  },
  pop_culture: {
    dbCategories: ["entertainment", "shopping"],
    tags: ["pop-culture", "quirky-japan"],
  },
  local_secrets: {
    dbCategories: [], // cross-category — uses is_hidden_gem flag + tags
    tags: ["hidden", "local-favorite"],
    hiddenGemOnly: true,
  },
  family_fun: {
    dbCategories: ["aquarium", "zoo", "park", "beach"],
    tags: ["families"],
  },
  history_buff: {
    dbCategories: ["museum", "castle", "historic_site", "landmark"],
    tags: ["learning"],
  },
  in_season: {
    dbCategories: [], // cross-category — uses seasonal tag matching
    seasonalMatch: true,
  },
};

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
