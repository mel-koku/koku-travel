import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { REGIONS, CITY_TO_REGION } from "@/data/regions";
import { getCityPageData, getAllCitySlugs } from "@/lib/cities/cityData";
import {
  getCityStats,
  getTopRatedLocations,
  getHiddenGems,
  getCategoryBreakdown,
  getCityHeroImage,
} from "@/lib/cities/cityHelpers";
import { buildCityJsonLd } from "@/lib/cities/cityJsonLd";
import { fetchLocationsByCity } from "@/lib/locations/locationService";
import { getCityMetadata } from "@/lib/tripBuilder/cityRelevance";
import { CityDetail } from "@/components/features/cities/CityDetail";
import type { KnownCityId } from "@/types/trip";

export const revalidate = 3600;

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCitySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityPageData(slug);

  if (!city) return { title: "City not found" };

  return {
    title: `${city.name}, Japan | Travel Guide | Koku Travel`,
    description: city.ogDescription,
    alternates: {
      canonical: `/cities/${slug}`,
    },
    openGraph: {
      title: `${city.name}, Japan | Travel Guide`,
      description: city.ogDescription,
      siteName: "Koku Travel",
    },
  };
}

export default async function CityDetailPage({ params }: RouteProps) {
  const { slug } = await params;
  const city = getCityPageData(slug);

  if (!city) notFound();

  const locations = await fetchLocationsByCity(city.name, {
    limit: 200,
    requirePlaceId: false,
  });

  const stats = getCityStats(locations);
  const topLocations = getTopRatedLocations(locations);
  const hiddenGems = getHiddenGems(locations);
  const categories = getCategoryBreakdown(locations);
  const heroImage = getCityHeroImage(locations);

  // Region context
  const regionId = CITY_TO_REGION[slug as KnownCityId];
  const region = REGIONS.find((r) => r.id === regionId);
  const regionName = region?.name ?? "";

  // Nearby cities (same region, excluding current)
  const nearbyCities = (region?.cities ?? [])
    .filter((c) => c.id !== slug)
    .map((c) => {
      const meta = getCityMetadata(c.id);
      return {
        id: c.id,
        name: c.name,
        locationCount: meta?.locationCount ?? 0,
      };
    });

  // Coordinates for JSON-LD
  const meta = getCityMetadata(slug);
  const coordinates = meta?.coordinates;

  const jsonLd = buildCityJsonLd(city, stats, topLocations, coordinates);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CityDetail
        city={city}
        stats={stats}
        categories={categories}
        topLocations={topLocations}
        hiddenGems={hiddenGems}
        heroImage={heroImage}
        regionName={regionName}
        nearbyCities={nearbyCities}
      />
    </>
  );
}
