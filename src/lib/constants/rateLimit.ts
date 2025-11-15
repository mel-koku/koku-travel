/**
 * Rate limiting constants
 */

// Default rate limit configuration
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Common rate limit configurations
export const RATE_LIMIT_WEBHOOK_MAX_REQUESTS = 20; // Lower limit for webhook endpoints
export const RATE_LIMIT_PREVIEW_MAX_REQUESTS = 20; // Lower limit for preview endpoints
export const RATE_LIMIT_AUTH_MAX_REQUESTS = 30; // Moderate limit for auth endpoints

// Retry after calculation (convert milliseconds to seconds)
export const MILLISECONDS_TO_SECONDS = 1000;

