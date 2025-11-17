import type { WeatherForecast, WeatherCondition } from "@/types/weather";
import type { CityId } from "@/types/trip";
import { logger } from "@/lib/logger";

/**
 * City coordinates for weather API calls
 */
const CITY_COORDINATES: Record<CityId, { lat: number; lng: number }> = {
  kyoto: { lat: 35.0116, lng: 135.7681 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  nara: { lat: 34.6851, lng: 135.8048 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  yokohama: { lat: 35.4437, lng: 139.638 },
};

/**
 * Map OpenWeatherMap condition codes to our WeatherCondition type
 */
function mapWeatherCondition(code: number): WeatherCondition {
  // OpenWeatherMap condition codes: https://openweathermap.org/weather-conditions
  if (code >= 200 && code < 300) return "thunderstorm";
  if (code >= 300 && code < 400) return "drizzle";
  if (code >= 500 && code < 600) return "rain";
  if (code >= 600 && code < 700) return "snow";
  if (code >= 700 && code < 800) {
    if (code === 701 || code === 741) return "mist";
    if (code === 721) return "haze";
    return "fog";
  }
  if (code === 800) return "clear";
  if (code >= 801 && code <= 804) return "clouds";
  return "clear"; // Default fallback
}

/**
 * Fetch weather forecast for a city and date range
 */
export async function fetchWeatherForecast(
  cityId: CityId,
  startDate: string, // ISO date string (yyyy-mm-dd)
  endDate: string, // ISO date string (yyyy-mm-dd)
): Promise<Map<string, WeatherForecast>> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    logger.warn("OpenWeatherMap API key not configured, returning mock weather data");
    return getMockWeatherForecast(startDate, endDate);
  }

  const coords = CITY_COORDINATES[cityId];
  if (!coords) {
    logger.warn(`Unknown city ID: ${cityId}, returning mock weather data`);
    return getMockWeatherForecast(startDate, endDate);
  }

  try {
    // OpenWeatherMap 5-day forecast API
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lng}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const forecasts = new Map<string, WeatherForecast>();

    // Group forecasts by date
    const forecastsByDate = new Map<string, Array<{
      temp: number;
      condition: WeatherCondition;
      precipitation: number;
      humidity: number;
    }>>();

    for (const item of data.list || []) {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split("T")[0];
      
      if (!dateKey) continue;

      const condition = mapWeatherCondition(item.weather[0]?.id ?? 800);
      const temp = item.main.temp;
      const precipitation = item.rain?.["3h"] ?? item.snow?.["3h"] ?? 0;
      const humidity = item.main.humidity ?? 0;

      if (!forecastsByDate.has(dateKey)) {
        forecastsByDate.set(dateKey, []);
      }
      forecastsByDate.get(dateKey)?.push({
        temp,
        condition,
        precipitation,
        humidity,
      });
    }

    // Aggregate forecasts per day
    for (const [dateKey, dayForecasts] of forecastsByDate.entries()) {
      if (dayForecasts.length === 0) continue;

      const temps = dayForecasts.map((f) => f.temp);
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      
      // Use most common condition, or rain if any rain exists
      const hasRain = dayForecasts.some((f) => f.condition === "rain" || f.condition === "drizzle");
      const condition = hasRain
        ? "rain"
        : dayForecasts[Math.floor(dayForecasts.length / 2)]?.condition ?? "clear";

      const totalPrecipitation = dayForecasts.reduce((sum, f) => sum + f.precipitation, 0);
      const avgHumidity = dayForecasts.reduce((sum, f) => sum + f.humidity, 0) / dayForecasts.length;
      
      // Get description from condition
      const conditionDescriptions: Record<string, string> = {
        clear: "Clear sky",
        clouds: "Cloudy",
        rain: "Rainy",
        drizzle: "Light rain",
        thunderstorm: "Thunderstorm",
        snow: "Snowy",
        mist: "Misty",
        fog: "Foggy",
        haze: "Hazy",
      };
      const description = conditionDescriptions[condition] ?? "Clear sky";

      forecasts.set(dateKey, {
        date: dateKey,
        condition,
        temperature: {
          min: Math.round(minTemp),
          max: Math.round(maxTemp),
        },
        precipitation: {
          probability: hasRain ? Math.min(100, Math.round(totalPrecipitation * 10)) : 0,
          amount: totalPrecipitation > 0 ? Math.round(totalPrecipitation * 10) / 10 : undefined,
        },
        humidity: Math.round(avgHumidity),
        description,
      });
    }

    return forecasts;
  } catch (error) {
    logger.error("Failed to fetch weather forecast", error instanceof Error ? error : new Error(String(error)), {
      cityId,
      startDate,
      endDate,
    });
    // Fallback to mock data
    return getMockWeatherForecast(startDate, endDate);
  }
}

/**
 * Generate mock weather forecast for development/testing
 */
function getMockWeatherForecast(
  startDate: string,
  endDate: string,
): Map<string, WeatherForecast> {
  const forecasts = new Map<string, WeatherForecast>();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  while (current <= end) {
    const dateKey = current.toISOString().split("T")[0];
    if (!dateKey) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Mock weather: mostly clear with occasional rain
    const dayOfYear = Math.floor((current.getTime() - new Date(current.getFullYear(), 0, 0).getTime()) / 86400000);
    const isRainy = dayOfYear % 5 === 0; // Every 5th day is rainy

    forecasts.set(dateKey, {
      date: dateKey,
      condition: isRainy ? "rain" : "clear",
      temperature: {
        min: 15,
        max: 25,
      },
      precipitation: isRainy
        ? {
            probability: 60,
            amount: 5.2,
          }
        : undefined,
      humidity: isRainy ? 75 : 50,
      description: isRainy ? "Light rain" : "Clear sky",
    });

    current.setDate(current.getDate() + 1);
  }

  return forecasts;
}

