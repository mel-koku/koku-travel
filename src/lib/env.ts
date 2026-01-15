import { logger } from "./logger";

/**
 * Environment variable validation and type-safe access
 * Validates all required environment variables at module load time
 */

type EnvConfig = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // Google APIs
  GOOGLE_PLACES_API_KEY?: string;
  ROUTING_GOOGLE_MAPS_API_KEY?: string;
  GOOGLE_DIRECTIONS_API_KEY?: string;

  // Routing (Optional)
  ROUTING_PROVIDER?: string;
  ROUTING_MAPBOX_ACCESS_TOKEN?: string;

  // Rate Limiting - Upstash removed temporarily (can be restored later)
  // UPSTASH_REDIS_REST_URL?: string;
  // UPSTASH_REDIS_REST_TOKEN?: string;

  // Site
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_USE_MOCK_ITINERARY?: string;

  // Cost Control Feature Flags
  ENABLE_GOOGLE_PLACES?: string;
  ENABLE_MAPBOX?: string;
  CHEAP_MODE?: string;
};

type RequiredEnvKeys =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

type OptionalEnvKeys = Exclude<keyof EnvConfig, RequiredEnvKeys>;

/**
 * Validates that a required environment variable is present and non-empty
 */
function requireEnv(key: RequiredEnvKeys): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please check your .env.local file and ensure ${key} is set.`,
    );
  }
  return value;
}

/**
 * Gets an optional environment variable
 */
function getOptionalEnv(key: OptionalEnvKeys): string | undefined {
  return process.env[key];
}

/**
 * Checks if we're running in a browser environment (client-side)
 * This works at runtime, not at build time
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Creates a lenient env config with defaults
 * Used when strict validation fails or in client-side code
 */
function createLenientConfig(): EnvConfig {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    ROUTING_GOOGLE_MAPS_API_KEY: process.env.ROUTING_GOOGLE_MAPS_API_KEY,
    GOOGLE_DIRECTIONS_API_KEY: process.env.GOOGLE_DIRECTIONS_API_KEY,
    ROUTING_PROVIDER: process.env.ROUTING_PROVIDER,
    ROUTING_MAPBOX_ACCESS_TOKEN: process.env.ROUTING_MAPBOX_ACCESS_TOKEN,
    // UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    // UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_USE_MOCK_ITINERARY: process.env.NEXT_PUBLIC_USE_MOCK_ITINERARY,
    ENABLE_GOOGLE_PLACES: process.env.ENABLE_GOOGLE_PLACES,
    ENABLE_MAPBOX: process.env.ENABLE_MAPBOX,
    CHEAP_MODE: process.env.CHEAP_MODE,
  };
}

/**
 * Validates environment variables and returns a typed config object
 * Throws an error if any required variables are missing (server-side only)
 */
function validateEnv(): EnvConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const isClientSide = isBrowser();

  // On client-side, NEXT_PUBLIC_* variables are embedded at build time
  // If they're missing, we can't fix it at runtime, so be lenient
  // This prevents runtime errors in the browser when variables weren't set during build
  if (isClientSide) {
    return createLenientConfig();
  }

  // Server-side: validate strictly in production (unless explicitly disabled)
  const shouldValidateStrictly = isProduction && process.env.VALIDATE_ENV !== "false";

  if (!shouldValidateStrictly) {
    // Development or validation disabled: use lenient mode
    return createLenientConfig();
  }

  // Strict validation: server-side production builds only
  // Validate server-side variables strictly
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
    GOOGLE_PLACES_API_KEY: getOptionalEnv("GOOGLE_PLACES_API_KEY"),
    ROUTING_GOOGLE_MAPS_API_KEY: getOptionalEnv("ROUTING_GOOGLE_MAPS_API_KEY"),
    GOOGLE_DIRECTIONS_API_KEY: getOptionalEnv("GOOGLE_DIRECTIONS_API_KEY"),
    ROUTING_PROVIDER: getOptionalEnv("ROUTING_PROVIDER"),
    ROUTING_MAPBOX_ACCESS_TOKEN: getOptionalEnv("ROUTING_MAPBOX_ACCESS_TOKEN"),
    // UPSTASH_REDIS_REST_URL: getOptionalEnv("UPSTASH_REDIS_REST_URL"),
    // UPSTASH_REDIS_REST_TOKEN: getOptionalEnv("UPSTASH_REDIS_REST_TOKEN"),
    NEXT_PUBLIC_SITE_URL: getOptionalEnv("NEXT_PUBLIC_SITE_URL"),
    NEXT_PUBLIC_USE_MOCK_ITINERARY: getOptionalEnv("NEXT_PUBLIC_USE_MOCK_ITINERARY"),
    ENABLE_GOOGLE_PLACES: getOptionalEnv("ENABLE_GOOGLE_PLACES"),
    ENABLE_MAPBOX: getOptionalEnv("ENABLE_MAPBOX"),
    CHEAP_MODE: getOptionalEnv("CHEAP_MODE"),
  };
}

// Validate and export env config
// On client-side or when validation fails, uses lenient mode with empty strings
let envConfig: EnvConfig;

try {
  envConfig = validateEnv();
} catch (error) {
  logger.error(
    "Environment validation error. Set VALIDATE_ENV=false to bypass temporarily.",
    error instanceof Error ? error : new Error(String(error)),
  );
  throw error;
}

// Export individual getters for type-safe access
export const env = {
  get supabaseUrl() {
    return envConfig.NEXT_PUBLIC_SUPABASE_URL;
  },
  get supabaseAnonKey() {
    return envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  },
  get supabaseServiceRoleKey() {
    return envConfig.SUPABASE_SERVICE_ROLE_KEY;
  },
  get routingProvider() {
    return envConfig.ROUTING_PROVIDER;
  },
  get routingMapboxAccessToken() {
    return envConfig.ROUTING_MAPBOX_ACCESS_TOKEN;
  },
  get googlePlacesApiKey() {
    return envConfig.GOOGLE_PLACES_API_KEY;
  },
  get routingGoogleMapsApiKey() {
    return envConfig.ROUTING_GOOGLE_MAPS_API_KEY;
  },
  get googleDirectionsApiKey() {
    return envConfig.GOOGLE_DIRECTIONS_API_KEY;
  },
  // Upstash removed temporarily - can be restored later
  // get upstashRedisRestUrl() {
  //   return envConfig.UPSTASH_REDIS_REST_URL;
  // },
  // get upstashRedisRestToken() {
  //   return envConfig.UPSTASH_REDIS_REST_TOKEN;
  // },
  get siteUrl() {
    return envConfig.NEXT_PUBLIC_SITE_URL;
  },
  get useMockItinerary() {
    return envConfig.NEXT_PUBLIC_USE_MOCK_ITINERARY === "true";
  },
  get isCheapMode() {
    return envConfig.CHEAP_MODE === "true";
  },
} as const;
