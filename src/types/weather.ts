/**
 * Weather condition types
 */
export type WeatherCondition =
  | "clear"
  | "clouds"
  | "rain"
  | "drizzle"
  | "thunderstorm"
  | "snow"
  | "mist"
  | "fog"
  | "haze";

/**
 * Weather forecast for a specific date
 */
export type WeatherForecast = {
  date: string; // ISO date string (yyyy-mm-dd)
  condition: WeatherCondition;
  temperature: {
    min: number; // Celsius
    max: number; // Celsius
  };
  precipitation?: {
    probability: number; // 0-100
    amount?: number; // mm
  };
  windSpeed?: number; // m/s
  humidity?: number; // 0-100
  description?: string; // Human-readable description
};

/**
 * Weather preferences for trip planning
 */
export type WeatherPreferences = {
  /**
   * Prefer indoor alternatives on rainy days
   */
  preferIndoorOnRain?: boolean;
  /**
   * Minimum temperature preference (Celsius)
   */
  minTemperature?: number;
  /**
   * Maximum temperature preference (Celsius)
   */
  maxTemperature?: number;
};

/**
 * Weather context for a trip
 */
export type TripWeatherContext = {
  /**
   * Weather forecasts by date
   */
  forecasts: Map<string, WeatherForecast>; // date -> forecast
  /**
   * Weather forecasts by city and date
   */
  cityForecasts: Map<string, Map<string, WeatherForecast>>; // cityId -> date -> forecast
};

