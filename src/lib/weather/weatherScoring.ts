import type { WeatherForecast } from "@/types/weather";
import type { Location } from "@/types/location";

/**
 * Determine if a location category is primarily outdoor
 */
/**
 * Determine environment from tags first, then fall back to category heuristic.
 */
function getEnvironment(location: Location): "indoor" | "outdoor" | "mixed" | "unknown" {
  if (location.tags?.includes("indoor")) return "indoor";
  if (location.tags?.includes("outdoor")) return "outdoor";
  if (location.tags?.includes("mixed")) return "mixed";

  // Fallback to category heuristic
  const category = location.category?.toLowerCase() ?? "";
  const outdoorCategories = [
    "park", "garden", "viewpoint", "nature",
    "shrine", "temple",
  ];
  const indoorCategories = [
    "museum", "restaurant", "shopping", "bar", "entertainment",
  ];
  const mixedCategories = [
    "landmark", "wellness", "market", "culture", "onsen",
  ];

  if (outdoorCategories.includes(category)) return "outdoor";
  if (indoorCategories.includes(category)) return "indoor";
  if (mixedCategories.includes(category)) return "mixed";
  return "unknown";
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
  const env = getEnvironment(location);

  // Rainy weather adjustments
  if (forecast.condition === "rain" || forecast.condition === "drizzle" || forecast.condition === "thunderstorm") {
    if (env === "outdoor") {
      const penalty = preferences?.preferIndoorOnRain ? -8 : -5;
      return {
        scoreAdjustment: penalty,
        reasoning: `Rainy weather makes outdoor ${category} less ideal`,
      };
    }
    if (env === "mixed") {
      return {
        scoreAdjustment: -3,
        reasoning: `Rainy weather partially affects ${category}`,
      };
    }
    if (env === "indoor") {
      return {
        scoreAdjustment: 5,
        reasoning: `Indoor ${category} is ideal for rainy weather`,
      };
    }
  }

  // Snowy weather adjustments
  if (forecast.condition === "snow") {
    if (env === "outdoor") {
      return {
        scoreAdjustment: -6,
        reasoning: `Snowy weather makes outdoor ${category} challenging`,
      };
    }
    if (env === "mixed") {
      return {
        scoreAdjustment: -2,
        reasoning: `Snowy weather partially affects ${category}`,
      };
    }
    if (env === "indoor") {
      return {
        scoreAdjustment: 4,
        reasoning: `Indoor ${category} is ideal for snowy weather`,
      };
    }
  }

  // Clear/cloudy weather - slight boost for outdoor activities
  if (forecast.condition === "clear" || forecast.condition === "clouds") {
    if (env === "outdoor") {
      return {
        scoreAdjustment: 2,
        reasoning: `Good weather for outdoor ${category}`,
      };
    }
    if (env === "mixed") {
      return {
        scoreAdjustment: 1,
        reasoning: `Good weather for ${category}`,
      };
    }
  }

  // Temperature-based adjustments (if available)
  if (forecast.temperature) {
    const avgTemp = (forecast.temperature.min + forecast.temperature.max) / 2;

    // Very cold or very hot - prefer indoor
    if (avgTemp < 5 || avgTemp > 35) {
      if (env === "outdoor") {
        return {
          scoreAdjustment: -3,
          reasoning: `Extreme temperature (${Math.round(avgTemp)}°C) makes outdoor ${category} less comfortable`,
        };
      }
      if (env === "indoor") {
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

