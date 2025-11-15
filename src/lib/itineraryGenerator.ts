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
      const fallback: CityInfo = { key: cityKey, label: location.city, regionId: regionIdFromLabel };
      CITY_INFO_BY_KEY.set(cityKey, fallback);
      return fallback;
    })();

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

function inferTravelMode(
  location: Location | undefined,
  previousLocation: Location | undefined,
): Itinerary["days"][number]["activities"][number]["travelMode"] {
  if (previousLocation?.preferredTransitModes?.length) {
    const firstMode = previousLocation.preferredTransitModes[0];
    if (firstMode) {
      return firstMode;
    }
  }
  if (location?.preferredTransitModes?.length) {
    const firstMode = location.preferredTransitModes[0];
    if (firstMode) {
      return firstMode;
    }
  }
  return "walk";
}

export function generateItinerary(data: TripBuilderData): Itinerary {
  const totalDays =
    typeof data.duration === "number" && data.duration > 0 ? data.duration : DEFAULT_TOTAL_DAYS;
  const activitiesPerDay = Math.min(3, Math.max(1, Math.floor(10 / totalDays)));

  const citySequence = resolveCitySequence(data);
  const interestSequence = resolveInterestSequence(data);
  const usedLocations = new Set<string>();

  const days: Itinerary["days"] = Array.from({ length: totalDays }).map((_, dayIndex) => {
    const cityInfo = citySequence[dayIndex % citySequence.length];
    if (!cityInfo) {
      throw new Error(`City info not found for day ${dayIndex}`);
    }
    const dayActivities: Itinerary["days"][number]["activities"] = [];
    const dayCityUsage = new Map<string, number>();

    for (let activityIndex = 0; activityIndex < activitiesPerDay; activityIndex += 1) {
      const interest = interestSequence[activityIndex % interestSequence.length];
      if (!interest) {
        throw new Error(`Interest not found for activity ${activityIndex}`);
      }
      const location = pickLocation(cityInfo, interest, usedLocations);
      const timeOfDay = TIME_OF_DAY_SEQUENCE[activityIndex % TIME_OF_DAY_SEQUENCE.length];
      if (!timeOfDay) {
        throw new Error(`Time of day not found for activity ${activityIndex}`);
      }

      if (location) {
        const locationKey = normalizeKey(location.city);
        dayCityUsage.set(locationKey, (dayCityUsage.get(locationKey) ?? 0) + 1);
        dayActivities.push({
          id: `${location.id}-${dayIndex + 1}-${activityIndex + 1}`,
          title: location.name,
          timeOfDay,
          neighborhood: location.city,
          tags: buildTags(interest, location.category),
        });
        usedLocations.add(location.id);
      }
    }

    const previousDay = dayIndex > 0 ? days[dayIndex - 1] : undefined;
    const previousLocation =
      previousDay && previousDay.activities.length > 0
        ? MOCK_LOCATIONS.find((loc) => {
            const lastActivity = previousDay.activities[previousDay.activities.length - 1];
            return lastActivity && loc.name === lastActivity.title;
          })
        : undefined;

    const firstActivity = dayActivities[0];
    const currentLocation = firstActivity
      ? MOCK_LOCATIONS.find((loc) => loc.name === firstActivity.title)
      : undefined;

    return {
      day: dayIndex + 1,
      title: buildDayTitle(dayIndex, cityInfo.key),
      activities: dayActivities.map((activity, index) => {
        const activityLocation = MOCK_LOCATIONS.find((loc) => loc.name === activity.title);
        const prevActivityLocation =
          index > 0
            ? MOCK_LOCATIONS.find((loc) => loc.name === dayActivities[index - 1]?.title)
            : previousLocation;

        return {
          ...activity,
          travelMode: inferTravelMode(activityLocation, prevActivityLocation),
        };
      }),
    };
  });

  return { days };
}

function resolveCitySequence(data: TripBuilderData): CityInfo[] {
  const sequence: CityInfo[] = [];
  const seen = new Set<string>();

  function addCityByKey(cityKey: string | undefined): void {
    if (!cityKey || seen.has(cityKey)) {
      return;
    }
    const info = CITY_INFO_BY_KEY.get(cityKey);
    if (!info) {
      return;
    }
    if (!LOCATIONS_BY_CITY_KEY.has(cityKey)) {
      return;
    }
    sequence.push(info);
    seen.add(cityKey);
  }

  if (data.cities && data.cities.length > 0) {
    data.cities.forEach((cityId) => addCityByKey(cityId));
  }

  if (data.regions && data.regions.length > 0) {
    data.regions.forEach((regionId) => {
      const region = REGIONS.find((r) => r.id === regionId);
      region?.cities.forEach((city) => addCityByKey(city.id));
    });
  }

  if (sequence.length === 0) {
    DEFAULT_CITY_ROTATION.forEach((cityId) => addCityByKey(cityId));
  }

  if (sequence.length === 0) {
    const firstLocation = ALL_LOCATIONS[0];
    if (firstLocation) {
      const firstCityKey = normalizeKey(firstLocation.city);
      addCityByKey(firstCityKey);
    }
  }

  if (sequence.length === 0) {
    sequence.push({ key: "japan", label: "Japan" });
  }

  return sequence;
}

function resolveInterestSequence(data: TripBuilderData): InterestId[] {
  if (data.interests && data.interests.length > 0) {
    return data.interests;
  }
  return [...DEFAULT_INTEREST_ROTATION];
}

function pickLocation(
  cityInfo: CityInfo,
  interest: InterestId,
  usedLocations: Set<string>,
): Location | undefined {
  const cityLocations = LOCATIONS_BY_CITY_KEY.get(cityInfo.key);
  if (!cityLocations || cityLocations.length === 0) {
    if (cityInfo.regionId) {
      const regionLocations = LOCATIONS_BY_REGION_ID.get(cityInfo.regionId);
      if (regionLocations && regionLocations.length > 0) {
        return pickFromList(regionLocations, interest, usedLocations);
      }
    }
    return pickFromList(ALL_LOCATIONS, interest, usedLocations);
  }

  return pickFromList(cityLocations, interest, usedLocations);
}

function pickFromList(
  list: Location[],
  interest: InterestId,
  usedLocations: Set<string>,
): Location | undefined {
  const categoryMap: Record<InterestId, LocationCategory[]> = {
    culture: ["shrine", "temple", "landmark", "historic"],
    food: ["restaurant", "market"],
    nature: ["park", "garden"],
    nightlife: ["bar", "entertainment"],
    shopping: ["shopping", "market"],
    photography: ["landmark", "viewpoint", "park"],
    wellness: ["park", "garden"],
    history: ["shrine", "temple", "historic", "museum"],
  };

  const preferredCategories = categoryMap[interest] ?? [];
  const unused = list.filter((loc) => !usedLocations.has(loc.id));

  if (unused.length === 0) {
    return list[Math.floor(Math.random() * list.length)];
  }

  const preferred = unused.filter((loc) => preferredCategories.includes(loc.category));
  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)];
  }

  return unused[Math.floor(Math.random() * unused.length)];
}

function buildTags(interest: InterestId, category: LocationCategory): string[] {
  const tags: string[] = [];
  const interestMap: Record<InterestId, string> = {
    culture: "cultural",
    food: "dining",
    nature: "nature",
    nightlife: "nightlife",
    shopping: "shopping",
    photography: "photo spot",
    wellness: "relaxation",
    history: "historical",
  };

  const categoryMap: Record<LocationCategory, string> = {
    shrine: "shrine",
    temple: "temple",
    landmark: "landmark",
    historic: "historic site",
    restaurant: "restaurant",
    market: "market",
    park: "park",
    garden: "garden",
    shopping: "shopping",
    bar: "nightlife",
    entertainment: "entertainment",
    museum: "museum",
    viewpoint: "viewpoint",
  };

  const interestTag = interestMap[interest];
  if (interestTag) {
    tags.push(interestTag);
  }

  const categoryTag = categoryMap[category];
  if (categoryTag && categoryTag !== interestTag) {
    tags.push(categoryTag);
  }

  return tags;
}

function buildDayTitle(dayIndex: number, cityKey: string): string {
  const region = CITY_TO_REGION[cityKey as CityId];
  if (region) {
    const cityInfo = CITY_INFO_BY_KEY.get(cityKey);
    const cityLabel = cityInfo?.label ?? capitalize(cityKey);
    return `Day ${dayIndex + 1} (${cityLabel})`;
  }
  
  for (const [regionId, cities] of Object.entries(CITY_TO_REGION)) {
    if (cities.includes(cityKey as CityId)) {
      const region = REGIONS.find((r) => r.id === regionId);
      if (region) {
        const city = region.cities.find((c) => c.id === cityKey);
        if (city) {
          return `Day ${dayIndex + 1} (${city.name})`;
        }
      }
    }
  }
  const info = CITY_INFO_BY_KEY.get(cityKey);
  const label = info?.label ?? capitalize(cityKey);
  return `Day ${dayIndex + 1} (${label})`;
}

function findAnyCityForRegion(regionId: RegionId): string | undefined {
  const region = REGIONS.find((r) => r.id === regionId);
  if (region && region.cities.length > 0) {
    for (const city of region.cities) {
      const cityKey = normalizeKey(city.id);
      if (LOCATIONS_BY_CITY_KEY.has(cityKey)) {
        return cityKey;
      }
    }
  }
  const regionLocations = LOCATIONS_BY_REGION_ID.get(regionId);
  if (regionLocations && regionLocations.length > 0) {
    const firstLocation = regionLocations[0];
    if (firstLocation) {
      return normalizeKey(firstLocation.city);
    }
  }
  return undefined;
}

function normalizeKey(value?: string): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
