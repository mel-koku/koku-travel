import type { CityId, RegionId } from "../types/trip";

export type Region = {
  id: RegionId;
  name: string;
  cities: {
    id: CityId;
    name: string;
  }[];
};

export const REGIONS: readonly Region[] = [
  {
    id: "kansai",
    name: "Kansai",
    cities: [
      { id: "kyoto", name: "Kyoto" },
      { id: "osaka", name: "Osaka" },
      { id: "nara", name: "Nara" },
    ],
  },
  {
    id: "kanto",
    name: "Kanto",
    cities: [
      { id: "tokyo", name: "Tokyo" },
      { id: "yokohama", name: "Yokohama" },
    ],
  },
] as const;

export const ALL_CITY_IDS = REGIONS.flatMap((region) =>
  region.cities.map((city) => city.id)
) as readonly CityId[];

export const CITY_TO_REGION: Record<CityId, RegionId> = REGIONS.reduce(
  (acc, region) => {
    region.cities.forEach((city) => {
      acc[city.id] = region.id;
    });
    return acc;
  },
  {} as Record<CityId, RegionId>,
);


