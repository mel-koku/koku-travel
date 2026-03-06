import type { Location } from "@/types/location";

export type CityStats = {
  totalLocations: number;
  hiddenGemsCount: number;
  topCategories: { category: string; count: number }[];
  averageRating: number;
};

export type CategoryBreakdown = {
  category: string;
  count: number;
  percentage: number;
};

export function getCityStats(locations: Location[]): CityStats {
  const categoryMap = new Map<string, number>();
  let ratingSum = 0;
  let ratedCount = 0;
  let hiddenGemsCount = 0;

  for (const loc of locations) {
    if (loc.category) {
      categoryMap.set(loc.category, (categoryMap.get(loc.category) ?? 0) + 1);
    }
    if (loc.rating) {
      ratingSum += loc.rating;
      ratedCount++;
    }
    if (loc.isHiddenGem) hiddenGemsCount++;
  }

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalLocations: locations.length,
    hiddenGemsCount,
    topCategories,
    averageRating: ratedCount > 0 ? ratingSum / ratedCount : 0,
  };
}

export function getTopRatedLocations(
  locations: Location[],
  limit = 8
): Location[] {
  return locations
    .filter((l) => l.rating && l.rating >= 3.5 && l.reviewCount && l.reviewCount >= 5)
    .sort((a, b) => {
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    })
    .slice(0, limit);
}

export function getHiddenGems(locations: Location[], limit = 4): Location[] {
  return locations
    .filter((l) => l.isHiddenGem)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit);
}

export function getCategoryBreakdown(locations: Location[]): CategoryBreakdown[] {
  const categoryMap = new Map<string, number>();
  for (const loc of locations) {
    if (loc.category) {
      categoryMap.set(loc.category, (categoryMap.get(loc.category) ?? 0) + 1);
    }
  }

  const total = locations.length || 1;
  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function getCityHeroImage(locations: Location[]): string | undefined {
  const withPhoto = locations
    .filter((l) => l.primaryPhotoUrl || l.image)
    .sort((a, b) => {
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });

  const top = withPhoto[0];
  return top?.primaryPhotoUrl ?? top?.image ?? undefined;
}
