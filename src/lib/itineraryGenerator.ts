import { MOCK_LOCATIONS } from "@/data/mockLocations";
import { CITY_TO_REGION, REGIONS } from "@/data/regions";
import type { Itinerary } from "@/types/itinerary";
import type { Location } from "@/types/location";
import type { CityId, InterestId, RegionId, TripBuilderData } from "@/types/trip";

const TIME_OF_DAY_SEQUENCE = ["morning", "afternoon", "evening"] as const;
const DEFAULT_TOTAL_DAYS = 5;
const DEFAULT_CITY_ROTATION: readonly CityId[] = ["kyoto", "tokyo", "osaka"] as const;
const DEFAULT_INTEREST_ROTATION: readonly InterestId[] = ["culture", "food", "nature", "shopping"];

type LocationCategory = (typeof MOCK_LOCATIONS)[number]["category"];

type CityInfo = {
  key: string;
  label: string;
  regionId?: RegionId;
};

const REGION_ID_BY_LABEL = new Map<string, RegionId>();
const CITY_INFO_BY_KEY = new Map<string, CityInfo>();

REGIONS.forEach((region) => {
  REGION_ID_BY_LABEL.set(normalizeKey(region.name), region.id);
  region.cities.forEach((city) => {
    const key = normalizeKey(city.id);
    CITY_INFO_BY_KEY.set(key, { key, label: city.name, regionId: region.id });
  });
});

const LOCATIONS_BY_CITY_KEY = new Map<string, Location[]>();
const LOCATIONS_BY_REGION_ID = new Map<RegionId, Location[]>();
const ALL_LOCATIONS: Location[] = [...MOCK_LOCATIONS];

MOCK_LOCATIONS.forEach((location) => {
  const cityKey = normalizeKey(location.city);
  if (!cityKey) {
    return;
  }
  const regionIdFromLabel = REGION_ID_BY_LABEL.get(normalizeKey(location.region));
  const existingInfo = CITY_INFO_BY_KEY.get(cityKey);
  const info: CityInfo =
    existingInfo ??
    (() => {
      const created: CityInfo = { key: cityKey, label: location.city, regionId: regionIdFromLabel };
      CITY_INFO_BY_KEY.set(cityKey, created);
      return created;
    })();

  if (!info.regionId && regionIdFromLabel) {
    info.regionId = regionIdFromLabel;
  }

  const cityList = LOCATIONS_BY_CITY_KEY.get(cityKey);
  if (cityList) {
    cityList.push(location);
  } else {
    LOCATIONS_BY_CITY_KEY.set(cityKey, [location]);
  }

  if (info.regionId) {
    const regionList = LOCATIONS_BY_REGION_ID.get(info.regionId);
    if (regionList) {
      regionList.push(location);
    } else {
      LOCATIONS_BY_REGION_ID.set(info.regionId, [location]);
    }
  }
});

LOCATIONS_BY_CITY_KEY.forEach((locations) => locations.sort((a, b) => a.name.localeCompare(b.name)));
LOCATIONS_BY_REGION_ID.forEach((locations) => locations.sort((a, b) => a.name.localeCompare(b.name)));
ALL_LOCATIONS.sort((a, b) => a.name.localeCompare(b.name));

const CATEGORY_FALLBACK_ORDER: LocationCategory[] = Array.from(
  new Set<LocationCategory>(ALL_LOCATIONS.map((location) => location.category)),
);

const INTEREST_CATEGORY_MAP: Record<InterestId, LocationCategory[]> = {
  culture: ["culture", "view"],
  food: ["food", "culture"],
  nature: ["nature", "view", "culture"],
  shopping: ["shopping", "culture"],
  photography: ["view", "nature", "culture"],
  nightlife: ["food", "view", "culture"],
  wellness: ["culture", "nature", "view"],
  history: ["culture", "view"],
};

export function generateItineraryFromTrip(data: TripBuilderData): Itinerary {
  const totalDays = data.duration && data.duration > 0 ? data.duration : DEFAULT_TOTAL_DAYS;
  const pace = data.style ?? "balanced";
  const activitiesPerDay = pace === "relaxed" ? 2 : pace === "fast" ? 4 : 3;

  const citySequence = resolveCitySequence(data);
  const interestSequence = resolveInterestSequence(data);
  const usedLocations = new Set<string>();

  const days: Itinerary["days"] = Array.from({ length: totalDays }).map((_, dayIndex) => {
    const cityInfo = citySequence[dayIndex % citySequence.length];
    const dayActivities: Itinerary["days"][number]["activities"] = [];
    const dayCityUsage = new Map<string, number>();

    for (let activityIndex = 0; activityIndex < activitiesPerDay; activityIndex += 1) {
      const interest = interestSequence[activityIndex % interestSequence.length];
      const location = pickLocation(cityInfo, interest, usedLocations);
      const timeOfDay = TIME_OF_DAY_SEQUENCE[activityIndex % TIME_OF_DAY_SEQUENCE.length];

      if (location) {
        const locationKey = normalizeKey(location.city);
        dayCityUsage.set(locationKey, (dayCityUsage.get(locationKey) ?? 0) + 1);
        dayActivities.push({
          kind: "place",
          id: `${location.id}-${dayIndex + 1}-${activityIndex + 1}`,
          title: location.name,
          timeOfDay,
          neighborhood: location.city,
          tags: buildTags(interest, location.category),
        });
        usedLocations.add(location.id);
      } else {
        dayActivities.push({
          kind: "place",
          id: `placeholder-${dayIndex + 1}-${activityIndex + 1}`,
          title: "Time to explore",
          timeOfDay,
          neighborhood: cityInfo.label,
          tags: [interest],
          notes: "Add your own highlight for this part of the day.",
        });
      }
    }

    const dominantCityKey = selectDominantCity(dayCityUsage) ?? cityInfo.key;
    const dateLabel = formatDayLabel(dayIndex, dominantCityKey);

    return {
      dateLabel,
      activities: dayActivities,
    };
  });

  return { days };
}

function resolveCitySequence(data: TripBuilderData): CityInfo[] {
  const sequence: CityInfo[] = [];
  const seen = new Set<string>();

  const addCityByKey = (cityKey?: string) => {
    const normalized = normalizeKey(cityKey);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    if (!LOCATIONS_BY_CITY_KEY.has(normalized)) {
      return;
    }
    const info = CITY_INFO_BY_KEY.get(normalized);
    if (!info) {
      return;
    }
    sequence.push(info);
    seen.add(normalized);
  };

  if (data.cities && data.cities.length > 0) {
    data.cities.forEach((cityId) => {
      const normalized = normalizeKey(cityId);
      if (LOCATIONS_BY_CITY_KEY.has(normalized)) {
        addCityByKey(normalized);
      } else {
        const regionId = CITY_TO_REGION[cityId];
        addCityByKey(findCityInRegionWithLocations(regionId));
      }
    });
  }

  if (sequence.length === 0 && data.regions && data.regions.length > 0) {
    data.regions.forEach((regionId) => addCityByKey(findCityInRegionWithLocations(regionId)));
  }

  if (sequence.length === 0) {
    DEFAULT_CITY_ROTATION.forEach((cityId) => addCityByKey(cityId));
  }

  if (sequence.length === 0) {
    const firstCityKey = ALL_LOCATIONS.length > 0 ? normalizeKey(ALL_LOCATIONS[0].city) : undefined;
    addCityByKey(firstCityKey);
  }

  if (sequence.length === 0) {
    sequence.push({ key: "japan", label: "Japan" });
  }

  return sequence;
}

function resolveInterestSequence(data: TripBuilderData): InterestId[] {
  if (data.interests && data.interests.length > 0) {
    const seen = new Set<InterestId>();
    const ordered: InterestId[] = [];
    data.interests.forEach((interest) => {
      if (!seen.has(interest)) {
        seen.add(interest);
        ordered.push(interest);
      }
    });
    return ordered;
  }
  return [...DEFAULT_INTEREST_ROTATION];
}

function pickLocation(cityInfo: CityInfo, interest: InterestId, usedLocations: Set<string>): Location | undefined {
  const categoryPriority = createCategoryPriority(interest);

  for (const allowRepeat of [false, true]) {
    for (const category of categoryPriority) {
      const cityCandidate = findCandidate(LOCATIONS_BY_CITY_KEY.get(cityInfo.key), category, usedLocations, allowRepeat);
      if (cityCandidate) {
        return cityCandidate;
      }

      if (cityInfo.regionId) {
        const regionCandidate = findCandidate(
          LOCATIONS_BY_REGION_ID.get(cityInfo.regionId),
          category,
          usedLocations,
          allowRepeat,
        );
        if (regionCandidate) {
          return regionCandidate;
        }
      }

      const anyCandidate = findCandidate(ALL_LOCATIONS, category, usedLocations, allowRepeat);
      if (anyCandidate) {
        return anyCandidate;
      }
    }
  }

  return undefined;
}

function createCategoryPriority(interest: InterestId): LocationCategory[] {
  const categories = INTEREST_CATEGORY_MAP[interest] ?? CATEGORY_FALLBACK_ORDER;
  return Array.from(new Set([...categories, ...CATEGORY_FALLBACK_ORDER]));
}

function findCandidate(
  locations: Location[] | undefined,
  category: LocationCategory,
  usedLocations: Set<string>,
  allowRepeat: boolean,
): Location | undefined {
  if (!locations || locations.length === 0) {
    return undefined;
  }

  return locations.find((location) => {
    if (location.category !== category) {
      return false;
    }
    if (allowRepeat) {
      return true;
    }
    return !usedLocations.has(location.id);
  });
}

function buildTags(interest: InterestId, category: LocationCategory): string[] {
  const tags = new Set<string>([interest, category]);
  return Array.from(tags);
}

function selectDominantCity(counts: Map<string, number>): string | undefined {
  let selected: string | undefined;
  let highest = 0;
  counts.forEach((count, key) => {
    if (count > highest) {
      selected = key;
      highest = count;
    }
  });
  return selected;
}

function formatDayLabel(dayIndex: number, cityKey: string): string {
  const info = CITY_INFO_BY_KEY.get(cityKey);
  const label = info?.label ?? capitalize(cityKey);
  return `Day ${dayIndex + 1} (${label})`;
}

function findCityInRegionWithLocations(regionId?: RegionId): string | undefined {
  if (!regionId) {
    return undefined;
  }
  const region = REGIONS.find((entry) => entry.id === regionId);
  if (!region) {
    return undefined;
  }
  for (const city of region.cities) {
    const cityKey = normalizeKey(city.id);
    if (LOCATIONS_BY_CITY_KEY.has(cityKey)) {
      return cityKey;
    }
  }
  const regionLocations = LOCATIONS_BY_REGION_ID.get(regionId);
  if (regionLocations && regionLocations.length > 0) {
    return normalizeKey(regionLocations[0].city);
  }
  return undefined;
}

function normalizeKey(value?: string): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function capitalize(value: string): string {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

