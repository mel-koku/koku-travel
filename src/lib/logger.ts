/* eslint-disable no-console */
/**
 * Centralized logging utility
 * In production, this can be extended to send logs to external services (Sentry, LogRocket, etc.)
 */

type LogContext = {
  [key: string]: unknown;
};

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  /**
   * Logs a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || "");
    }
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || "");
    }
    // In production, could send to logging service
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || "");
    // In production, could send to logging service
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${message}`, errorDetails, context || "");

    // In production, send to error tracking service
    if (this.isProduction) {
      this.sendToErrorTracking(message, error, context);
    }
  }

  /**
   * Sends error to external error tracking service
   * Integrates with Sentry if configured
   */
  private sendToErrorTracking(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ): void {
    // Try to use Sentry if available and configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      try {
        // Dynamic import to avoid breaking if Sentry is not installed
        if (typeof window !== "undefined") {
          // Client-side: use dynamic import
          import("@sentry/nextjs").then((Sentry) => {
            Sentry.captureException(error || new Error(message), {
              extra: this.sanitizeContext(context || {}),
              tags: { source: "logger" },
            });
          }).catch(() => {
            // Sentry not available, continue silently
          });
        } else {
          // Server-side: use dynamic import (works in Node.js)
          import("@sentry/nextjs")
            .then((Sentry) => {
              Sentry.captureException(error || new Error(message), {
                extra: this.sanitizeContext(context || {}),
                tags: { source: "logger" },
              });
            })
            .catch(() => {
              // Sentry not available, continue silently
            });
        }
        return;
      } catch {
        // Sentry not available, fall through to default logging
      }
    }

    // Default: log to console in production if error tracking is enabled
    if (process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === "true") {
      // Log structured error for potential log aggregation
      console.error("[ERROR_TRACKING]", {
        message,
        error: error instanceof Error ? error.message : String(error),
        context: this.sanitizeContext(context || {}),
      });
    }
  }

  /**
   * Sanitize context to remove sensitive data
   * Handles nested objects, arrays, and various sensitive key patterns
   * 
   * @param context - Context object to sanitize
   * @param depth - Current recursion depth (default: 0)
   * @param maxDepth - Maximum recursion depth (default: 10)
   * @returns Sanitized context object
   */
  private sanitizeContext(
    context: LogContext,
    depth: number = 0,
    maxDepth: number = 10,
  ): LogContext {
    // Prevent infinite recursion
    if (depth > maxDepth) {
      return { "[ERROR]": "Maximum sanitization depth exceeded" };
    }

    // Handle null/undefined
    if (context === null || context === undefined) {
      return context;
    }

    // Handle primitives (string, number, boolean)
    if (typeof context !== "object") {
      return context;
    }

    // Handle arrays
    if (Array.isArray(context)) {
      return context.map((item) =>
        typeof item === "object" && item !== null
          ? this.sanitizeContext(item as LogContext, depth + 1, maxDepth)
          : item,
      ) as unknown as LogContext;
    }

    // Handle objects
    const sanitized: LogContext = {};
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "authorization",
      "cookie",
      "api_key",
      "apikey",
      "api-key",
      "credential",
      "credentials",
      "access_token",
      "access-token",
      "refresh_token",
      "refresh-token",
      "session",
      "sessionid",
      "session_id",
      "private_key",
      "private-key",
      "public_key",
      "public-key",
      "passphrase",
      "passwd",
    ];

    for (const key in context) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive));

      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else {
        const value = context[key];
        // Recursively sanitize nested objects and arrays
        if (typeof value === "object" && value !== null) {
          sanitized[key] = this.sanitizeContext(value as LogContext, depth + 1, maxDepth);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Helper function to sanitize sensitive data from context
 * Handles nested objects, arrays, and various sensitive key patterns
 * 
 * @param context - Context object to sanitize
 * @param depth - Current recursion depth (default: 0)
 * @param maxDepth - Maximum recursion depth (default: 10)
 * @returns Sanitized context object
 */
export function sanitizeContext(
  context: LogContext,
  depth: number = 0,
  maxDepth: number = 10,
): LogContext {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return { "[ERROR]": "Maximum sanitization depth exceeded" };
  }

  // Handle null/undefined
  if (context === null || context === undefined) {
    return context;
  }

  // Handle primitives (string, number, boolean)
  if (typeof context !== "object") {
    return context;
  }

  // Handle arrays
  if (Array.isArray(context)) {
    return context.map((item) =>
      typeof item === "object" && item !== null
        ? sanitizeContext(item as LogContext, depth + 1, maxDepth)
        : item,
    ) as unknown as LogContext;
  }

  // Handle objects
  const sanitized: LogContext = {};
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "cookie",
    "api_key",
    "apikey",
    "api-key",
    "credential",
    "credentials",
    "access_token",
    "access-token",
    "refresh_token",
    "refresh-token",
    "session",
    "sessionid",
    "session_id",
    "private_key",
    "private-key",
    "public_key",
    "public-key",
    "passphrase",
    "passwd",
  ];

  for (const key in context) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else {
      const value = context[key];
      // Recursively sanitize nested objects and arrays
      if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeContext(value as LogContext, depth + 1, maxDepth);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

