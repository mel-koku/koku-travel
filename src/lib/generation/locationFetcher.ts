import type { Location } from "@/types/location";
import type { RegionId } from "@/types/trip";
import { normalizeKey } from "@/lib/utils/stringUtils";
import {
  type CityInfo,
  CITY_INFO_BY_KEY,
  REGION_ID_BY_LABEL,
} from "@/lib/routing/citySequence";

/**
 * Builds location maps from an array of locations.
 * Organizes locations by city and region for efficient lookup.
 */
export function buildLocationMaps(locations: Location[]): {
  locationsByCityKey: Map<string, Location[]>;
  locationsByRegionId: Map<RegionId, Location[]>;
  allLocations: Location[];
} {
  const locationsByCityKey = new Map<string, Location[]>();
  const locationsByRegionId = new Map<RegionId, Location[]>();

  locations.forEach((location) => {
    // Use planning_city (coordinate-snapped KnownCityId) when available, fall back to city field
    const cityKey = location.planningCity ?? normalizeKey(location.city);
    if (!cityKey) {
      return;
    }
    const regionIdFromLabel = REGION_ID_BY_LABEL.get(normalizeKey(location.region));
    const existingInfo = CITY_INFO_BY_KEY.get(cityKey);
    const info: CityInfo =
      existingInfo ??
      (() => {
        const fallback: CityInfo = { key: cityKey, label: location.planningCity ?? location.city, regionId: regionIdFromLabel };
        CITY_INFO_BY_KEY.set(cityKey, fallback);
        return fallback;
      })();

    const cityList = locationsByCityKey.get(cityKey);
    if (cityList) {
      cityList.push(location);
    } else {
      locationsByCityKey.set(cityKey, [location]);
    }

    if (info.regionId) {
      const regionList = locationsByRegionId.get(info.regionId);
      if (regionList) {
        regionList.push(location);
      } else {
        locationsByRegionId.set(info.regionId, [location]);
      }
    }
  });

  // Sort locations within each map
  locationsByCityKey.forEach((locationList) => locationList.sort((a, b) => a.name.localeCompare(b.name)));
  locationsByRegionId.forEach((locationList) => locationList.sort((a, b) => a.name.localeCompare(b.name)));

  return {
    locationsByCityKey,
    locationsByRegionId,
    allLocations: locations,
  };
}
