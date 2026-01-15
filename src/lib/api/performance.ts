import { logger } from "../logger";
import type { RequestContext } from "./middleware";

/**
 * Performance monitoring for API routes
 * Tracks response times, error rates, and other metrics
 */

type PerformanceMetric = {
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  requestId?: string;
  userId?: string;
};

/**
 * Tracks API route performance metrics
 */
export function trackApiPerformance(
  route: string,
  method: string,
  duration: number,
  statusCode: number,
  context?: RequestContext,
): void {
  const metric: PerformanceMetric = {
    route,
    method,
    duration,
    statusCode,
    timestamp: Date.now(),
    requestId: context?.requestId,
    userId: context?.user?.id,
  };

  // Log performance metrics
  if (process.env.NODE_ENV === "development") {
    logger.debug(`API Performance: ${method} ${route}`, {
      duration: `${duration}ms`,
      statusCode,
      requestId: context?.requestId,
    });
  }

  // In production, send to monitoring service
  if (process.env.NODE_ENV === "production") {
    // Send to analytics endpoint if configured
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "api_performance",
          ...metric,
        }),
      }).catch(() => {
        // Silently fail if analytics endpoint is unavailable
      });
    }

    // Log slow requests (>1s) for investigation
    if (duration > 1000) {
      logger.warn(`Slow API request detected: ${method} ${route}`, {
        duration: `${duration}ms`,
        statusCode,
        requestId: context?.requestId,
      });
    }

    // Log error responses for monitoring
    if (statusCode >= 400) {
      logger.warn(`API error response: ${method} ${route}`, {
        statusCode,
        duration: `${duration}ms`,
        requestId: context?.requestId,
      });
    }
  }
}

/**
 * Wraps an API route handler to track performance
 */
export function withPerformanceTracking<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
  route: string,
  method: string,
) {
  return async (...args: T): Promise<Response> => {
    const startTime = Date.now();
    let statusCode = 500;

    try {
      const response = await handler(...args);
      statusCode = response.status;
      return response;
    } catch (error) {
      statusCode = 500;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      // Extract context from args if available
      const context = args[0] && typeof args[0] === "object" && "nextUrl" in args[0]
        ? undefined // RequestContext would need to be passed separately
        : undefined;

      trackApiPerformance(route, method, duration, statusCode, context);
    }
  };
}

/**
 * Helper to measure async operation duration
 */
export async function measureDuration<T>(
  operation: () => Promise<T>,
  label: string,
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Operation duration: ${label}`, { duration: `${duration}ms` });
    }
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.warn(`Operation failed: ${label}`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
