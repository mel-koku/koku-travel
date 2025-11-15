import { useMemo } from "react";
import { INTEREST_CATEGORIES } from "@/data/interests";
import { REGIONS } from "@/data/regions";
import type { CityId, InterestId, RegionId, TripBuilderData, TripStyle } from "@/types/trip";

const REGION_LABEL_BY_ID = REGIONS.reduce<Record<RegionId, string>>((acc, region) => {
  acc[region.id] = region.name;
  return acc;
}, {} as Record<RegionId, string>);

const CITY_LABEL_BY_ID = REGIONS.reduce<Record<CityId, string>>((acc, region) => {
  region.cities.forEach((city) => {
    acc[city.id] = city.name;
  });
  return acc;
}, {} as Record<CityId, string>);

const INTEREST_LABEL_BY_ID = INTEREST_CATEGORIES.reduce<Record<InterestId, string>>(
  (acc, category) => {
    acc[category.id] = category.name;
    return acc;
  },
  {} as Record<InterestId, string>,
);

const TRIP_STYLE_LABEL: Record<TripStyle, string> = {
  relaxed: "Relaxed",
  balanced: "Balanced",
  fast: "Fast",
};

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  gluten_free: "Gluten-Free",
  no_seafood: "No Seafood",
  other: "Other",
};

export function useFormattedTripData(data: TripBuilderData) {
  const suggestedTripName = useMemo(() => {
    const fallback = "My Japan Itinerary";

    const startDate = data.dates?.start;
    if (startDate) {
      const parsed = new Date(startDate);
      if (!Number.isNaN(parsed.getTime())) {
        const formatter = new Intl.DateTimeFormat(undefined, {
          month: "long",
          day: "numeric",
        });
        const label = formatter.format(parsed);
        if (data.duration && Number.isFinite(data.duration)) {
          return `${label} · ${data.duration}-day plan`;
        }
        return `${label} getaway`;
      }
    }

    if (data.cities && data.cities.length > 0) {
      const city = data.cities[0];
      if (!city) return "Custom adventure";
      const cityLabel = CITY_LABEL_BY_ID[city] ?? city;
      return `${cityLabel} adventure`;
    }

    if (data.regions && data.regions.length > 0) {
      const region = data.regions[0];
      if (!region) return "Custom journey";
      const regionLabel = REGION_LABEL_BY_ID[region] ?? region;
      return `${regionLabel} journey`;
    }

    return fallback;
  }, [data]);

  const formattedDates = useMemo(() => {
    if (!data.dates?.start && !data.dates?.end) {
      return "Not set";
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    });

    const startLabel = data.dates?.start
      ? safeFormatDate(formatter, data.dates.start)
      : "Start date not set";
    const endLabel = data.dates?.end
      ? safeFormatDate(formatter, data.dates.end)
      : "End date not set";

    if (!data.dates?.start || !data.dates?.end) {
      return `${startLabel}${data.dates?.start && data.dates?.end ? "" : " · "}${endLabel}`;
    }

    return `${startLabel} → ${endLabel}`;
  }, [data.dates]);

  const formattedRegions = useMemo(() => {
    if (!data.regions || data.regions.length === 0) {
      return "No regions selected";
    }
    return data.regions.map((regionId) => REGION_LABEL_BY_ID[regionId] ?? regionId).join(", ");
  }, [data.regions]);

  const formattedCities = useMemo(() => {
    if (!data.cities || data.cities.length === 0) {
      return "No cities selected";
    }
    return data.cities.map((cityId) => CITY_LABEL_BY_ID[cityId] ?? cityId).join(", ");
  }, [data.cities]);

  const formattedInterests = useMemo(() => {
    if (!data.interests || data.interests.length === 0) {
      return "No interests selected";
    }
    return data.interests.map((interestId) => INTEREST_LABEL_BY_ID[interestId] ?? interestId).join(", ");
  }, [data.interests]);

  const formattedDietary = useMemo(() => {
    const dietary = data.accessibility?.dietary ?? [];
    const dietaryOther = data.accessibility?.dietaryOther?.trim() ?? "";
    if (dietary.length === 0 && dietaryOther.length === 0) {
      return "No dietary restrictions";
    }
    const labels = dietary.map((entry) => {
      if (entry === "other" && dietaryOther.length > 0) {
        return `Other: ${dietaryOther}`;
      }
      return DIETARY_LABELS[entry] ?? entry;
    });
    return labels.join(", ");
  }, [data.accessibility?.dietary, data.accessibility?.dietaryOther]);

  const formattedTripStyle = useMemo(() => {
    return data.style ? TRIP_STYLE_LABEL[data.style] ?? data.style : "Not set";
  }, [data.style]);

  const notesValue = useMemo(() => {
    return data.accessibility?.notes?.trim();
  }, [data.accessibility?.notes]);

  return {
    suggestedTripName,
    formattedDates,
    formattedRegions,
    formattedCities,
    formattedInterests,
    formattedDietary,
    formattedTripStyle,
    notesValue,
  };
}

function safeFormatDate(formatter: Intl.DateTimeFormat, isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  try {
    return formatter.format(date);
  } catch {
    return isoDate;
  }
}

