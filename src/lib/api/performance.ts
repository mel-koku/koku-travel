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

