import type { WeatherForecast } from "@/types/weather";
import type { Location } from "@/types/location";

/**
 * Determine if a location category is primarily outdoor
 */
function isOutdoorCategory(category: string): boolean {
  const outdoorCategories = [
    "park",
    "garden",
    "viewpoint",
    "landmark", // Often outdoor landmarks
    "shrine", // Often outdoor
    "temple", // Often outdoor
  ];
  return outdoorCategories.includes(category.toLowerCase());
}

/**
 * Determine if a location category is primarily indoor
 */
function isIndoorCategory(category: string): boolean {
  const indoorCategories = [
    "museum",
    "restaurant",
    "shopping",
    "bar",
    "entertainment",
  ];
  return indoorCategories.includes(category.toLowerCase());
}

/**
 * Score weather fit for a location
 * Returns a score adjustment (-10 to +10) based on weather conditions
 */
export function scoreWeatherFit(
  location: Location,
  forecast: WeatherForecast | undefined,
  preferences?: {
    preferIndoorOnRain?: boolean;
  },
): { scoreAdjustment: number; reasoning: string } {
  if (!forecast) {
    return {
      scoreAdjustment: 0,
      reasoning: "No weather forecast available",
    };
  }

  const category = location.category?.toLowerCase() ?? "";
  const isOutdoor = isOutdoorCategory(category);
  const isIndoor = isIndoorCategory(category);

  // Rainy weather adjustments
  if (forecast.condition === "rain" || forecast.condition === "drizzle" || forecast.condition === "thunderstorm") {
    if (isOutdoor) {
      // Penalize outdoor activities on rainy days
      const penalty = preferences?.preferIndoorOnRain ? -8 : -5;
      return {
        scoreAdjustment: penalty,
        reasoning: `Rainy weather makes outdoor ${category} less ideal`,
      };
    }
    if (isIndoor) {
      // Boost indoor activities on rainy days
      return {
        scoreAdjustment: 5,
        reasoning: `Indoor ${category} is ideal for rainy weather`,
      };
    }
  }

  // Snowy weather adjustments
  if (forecast.condition === "snow") {
    if (isOutdoor) {
      return {
        scoreAdjustment: -6,
        reasoning: `Snowy weather makes outdoor ${category} challenging`,
      };
    }
    if (isIndoor) {
      return {
        scoreAdjustment: 4,
        reasoning: `Indoor ${category} is ideal for snowy weather`,
      };
    }
  }

  // Clear/cloudy weather - slight boost for outdoor activities
  if (forecast.condition === "clear" || forecast.condition === "clouds") {
    if (isOutdoor) {
      return {
        scoreAdjustment: 2,
        reasoning: `Good weather for outdoor ${category}`,
      };
    }
  }

  // Temperature-based adjustments (if available)
  if (forecast.temperature) {
    const avgTemp = (forecast.temperature.min + forecast.temperature.max) / 2;
    
    // Very cold or very hot - prefer indoor
    if (avgTemp < 5 || avgTemp > 35) {
      if (isOutdoor) {
        return {
          scoreAdjustment: -3,
          reasoning: `Extreme temperature (${Math.round(avgTemp)}°C) makes outdoor ${category} less comfortable`,
        };
      }
      if (isIndoor) {
        return {
          scoreAdjustment: 2,
          reasoning: `Indoor ${category} provides shelter from extreme temperature`,
        };
      }
    }
  }

  return {
    scoreAdjustment: 0,
    reasoning: "Weather conditions are suitable for this activity",
  };
}

