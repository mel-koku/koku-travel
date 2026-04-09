import type { Metadata } from "next";
import { REGIONS } from "@/data/regions";
import { REGION_DESCRIPTIONS } from "@/data/regionDescriptions";
import { CITY_PAGE_DATA, getAllCitySlugs } from "@/lib/cities/cityData";
import { getCityMetadata } from "@/lib/tripBuilder/cityRelevance";
import { CityIndex } from "@/components/features/cities/CityIndex";

export const metadata: Metadata = {
  title: "Cities of Japan | Yuku Japan",
  description:
    "Explore 35 cities across 9 regions of Japan. From Tokyo's neon streets to Kyoto's temple gardens, find your perfect destination.",
  openGraph: {
    title: "Cities of Japan | Yuku Japan",
    description:
      "Explore 35 cities across 9 regions of Japan. From Tokyo's neon streets to Kyoto's temple gardens, find your perfect destination.",
    siteName: "Yuku Japan",
  },
};

export const revalidate = 3600;

export default function CitiesIndexPage() {
  const allSlugs = getAllCitySlugs();

  const regions = REGIONS.map((region) => {
    const regionDesc = REGION_DESCRIPTIONS.find((r) => r.id === region.id);

    const cities = region.cities.map((c) => {
      const pageData = CITY_PAGE_DATA[c.id];
      const meta = getCityMetadata(c.id);

      return {
        data: pageData,
        stats: {
          totalLocations: meta?.locationCount ?? 0,
          hiddenGemsCount: 0,
          topCategories: [] as { category: string; count: number }[],
          averageRating: 0,
        },
        heroImage: undefined as string | undefined,
      };
    });

    return {
      regionId: region.id,
      regionName: region.name,
      tagline: regionDesc?.tagline ?? "",
      cities,
    };
  });

  return (
    <CityIndex regions={regions} totalCities={allSlugs.length} />
  );
}
