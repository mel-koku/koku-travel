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
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?: string;
  NEXT_PUBLIC_MAPBOX_STYLE_URL?: string;

  // Rate Limiting - Upstash Redis
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;

  // Site
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_USE_MOCK_ITINERARY?: string;

  // Cost Control Feature Flags
  ENABLE_GOOGLE_PLACES?: string;
  ENABLE_MAPBOX?: string;
  CHEAP_MODE?: string;

  // Vertex AI (Gemini)
  GOOGLE_APPLICATION_CREDENTIALS_JSON?: string;
  GOOGLE_VERTEX_PROJECT?: string;
  GOOGLE_VERTEX_LOCATION?: string;
  ENABLE_CHAT?: string;
  GUIDE_PROSE_PER_CALL_TIMEOUT_MS?: string;

  // NAVITIME (Japan transit routing via RapidAPI)
  NAVITIME_RAPIDAPI_KEY?: string;

  // Email (Resend)
  RESEND_API_KEY?: string;
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
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NEXT_PUBLIC_MAPBOX_STYLE_URL: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_USE_MOCK_ITINERARY: process.env.NEXT_PUBLIC_USE_MOCK_ITINERARY,
    ENABLE_GOOGLE_PLACES: process.env.ENABLE_GOOGLE_PLACES,
    ENABLE_MAPBOX: process.env.ENABLE_MAPBOX,
    CHEAP_MODE: process.env.CHEAP_MODE,
    GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    GOOGLE_VERTEX_PROJECT: process.env.GOOGLE_VERTEX_PROJECT,
    GOOGLE_VERTEX_LOCATION: process.env.GOOGLE_VERTEX_LOCATION,
    ENABLE_CHAT: process.env.ENABLE_CHAT,
    GUIDE_PROSE_PER_CALL_TIMEOUT_MS: process.env.GUIDE_PROSE_PER_CALL_TIMEOUT_MS,
    NAVITIME_RAPIDAPI_KEY: process.env.NAVITIME_RAPIDAPI_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };
}

/**
 * Validates environment variables and returns a typed config object
 * Throws an error if any required variables are missing (server-side only)
 */
function validateEnv(): EnvConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const isVercelProduction = process.env.VERCEL_ENV === "production";
  const isClientSide = isBrowser();

  // On client-side, NEXT_PUBLIC_* variables are embedded at build time
  // If they're missing, we can't fix it at runtime, so be lenient
  // This prevents runtime errors in the browser when variables weren't set during build
  if (isClientSide) {
    return createLenientConfig();
  }

  const validateEnvFlag = process.env.VALIDATE_ENV;

  // Block VALIDATE_ENV=false in Vercel production
  if (isVercelProduction && validateEnvFlag === "false") {
    throw new Error(
      "VALIDATE_ENV=false is not allowed in Vercel production. " +
      "Configure all required environment variables properly.",
    );
  }

  // Server-side: validate strictly in production (unless explicitly disabled)
  const shouldValidateStrictly = isProduction && validateEnvFlag !== "false";

  if (!shouldValidateStrictly) {
    if (isProduction && validateEnvFlag === "false") {
      logger.warn(
        "Environment validation disabled. Only acceptable for preview/staging.",
        { vercelEnv: process.env.VERCEL_ENV || "unknown" },
      );
    }
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
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NEXT_PUBLIC_MAPBOX_STYLE_URL: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL,
    UPSTASH_REDIS_REST_URL: getOptionalEnv("UPSTASH_REDIS_REST_URL"),
    UPSTASH_REDIS_REST_TOKEN: getOptionalEnv("UPSTASH_REDIS_REST_TOKEN"),
    NEXT_PUBLIC_SITE_URL: getOptionalEnv("NEXT_PUBLIC_SITE_URL"),
    NEXT_PUBLIC_USE_MOCK_ITINERARY: getOptionalEnv("NEXT_PUBLIC_USE_MOCK_ITINERARY"),
    ENABLE_GOOGLE_PLACES: getOptionalEnv("ENABLE_GOOGLE_PLACES"),
    ENABLE_MAPBOX: getOptionalEnv("ENABLE_MAPBOX"),
    CHEAP_MODE: getOptionalEnv("CHEAP_MODE"),
    GOOGLE_APPLICATION_CREDENTIALS_JSON: getOptionalEnv("GOOGLE_APPLICATION_CREDENTIALS_JSON"),
    GOOGLE_VERTEX_PROJECT: getOptionalEnv("GOOGLE_VERTEX_PROJECT"),
    GOOGLE_VERTEX_LOCATION: getOptionalEnv("GOOGLE_VERTEX_LOCATION"),
    ENABLE_CHAT: getOptionalEnv("ENABLE_CHAT"),
    GUIDE_PROSE_PER_CALL_TIMEOUT_MS: getOptionalEnv("GUIDE_PROSE_PER_CALL_TIMEOUT_MS"),
    NAVITIME_RAPIDAPI_KEY: getOptionalEnv("NAVITIME_RAPIDAPI_KEY"),
    RESEND_API_KEY: getOptionalEnv("RESEND_API_KEY"),
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
  get mapboxAccessToken() {
    return envConfig.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  },
  /**
   * Mapbox custom style URL. Overridable via NEXT_PUBLIC_MAPBOX_STYLE_URL
   * so the account handle / style ID can be rotated without a code change.
   */
  get mapboxStyleUrl() {
    return (
      envConfig.NEXT_PUBLIC_MAPBOX_STYLE_URL ||
      "mapbox://styles/yuku-mel/cmntt84uu000801srgni672hh"
    );
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
  get upstashRedisRestUrl() {
    return envConfig.UPSTASH_REDIS_REST_URL;
  },
  get upstashRedisRestToken() {
    return envConfig.UPSTASH_REDIS_REST_TOKEN;
  },
  get siteUrl() {
    return envConfig.NEXT_PUBLIC_SITE_URL;
  },
  get useMockItinerary() {
    return envConfig.NEXT_PUBLIC_USE_MOCK_ITINERARY === "true";
  },
  get isCheapMode() {
    return envConfig.CHEAP_MODE === "true";
  },
  get isChatEnabled() {
    return envConfig.ENABLE_CHAT !== "false";
  },
  /**
   * Per-call Vertex timeout for guide prose generation, in milliseconds.
   * Default 10_000. Clamped to [5_000, 15_000] -- outside this range the
   * call will either fail immediately (too low) or blow past the 18s global
   * deadline's slippage budget (too high). Raise toward 12_000 if
   * observability shows daysDeadline + daysFailed > 10% of totalDays
   * consistently. The global deadline stays at 18_000 and is not
   * env-configurable; if per-call is raised significantly, update the
   * GLOBAL_DEADLINE_MS constant in code in lockstep.
   */
  get guideProsePerCallTimeoutMs(): number {
    const raw = envConfig.GUIDE_PROSE_PER_CALL_TIMEOUT_MS;
    if (!raw) return 10_000;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return 10_000;
    return Math.min(15_000, Math.max(5_000, parsed));
  },
  get navitimeRapidApiKey() {
    return envConfig.NAVITIME_RAPIDAPI_KEY;
  },
  get resendApiKey() {
    return envConfig.RESEND_API_KEY;
  },
} as const;
