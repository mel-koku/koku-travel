import type { VibeId } from "./vibes";
import { locationHasSeasonalTag, getCurrentMonth } from "@/lib/utils/seasonUtils";

export const VIBE_FILTER_MAP: Record<
  VibeId,
  { dbCategories: string[]; hiddenGemOnly?: boolean; seasonalMatch?: boolean }
> = {
  cultural_heritage: {
    dbCategories: [
      "shrine",
      "temple",
      "museum",
      "landmark",
      "culture",
      "performing_arts",
    ],
  },
  foodie_paradise: {
    dbCategories: ["restaurant", "cafe", "bar", "market"],
  },
  hidden_gems: {
    dbCategories: [], // cross-category — uses is_hidden_gem flag
    hiddenGemOnly: true,
  },
  neon_nightlife: {
    dbCategories: [
      "entertainment",
      "shopping",
      "mall",
      "street",
      "specialty",
      "bar",
    ],
  },
  nature_adventure: {
    dbCategories: [
      "park",
      "garden",
      "beach",
      "mountain",
      "onsen",
      "nature",
      "wellness",
      "viewpoint",
      "tower",
      "view",
    ],
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
    return mapping.dbCategories.includes(location.category.toLowerCase());
  });
}
