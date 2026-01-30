/* eslint-disable no-console */
/**
 * Centralized logging utility
 * In production, errors are sent to Sentry for monitoring
 */
import * as Sentry from "@sentry/nextjs";

type LogContext = {
  [key: string]: unknown;
};

/**
 * List of sensitive keys that should be redacted from logs
 */
const SENSITIVE_KEYS = [
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
] as const;

/** Maximum recursion depth for sanitization */
const MAX_SANITIZATION_DEPTH = 10;

/**
 * Helper function to sanitize sensitive data from context
 * Handles nested objects, arrays, and various sensitive key patterns
 *
 * @param context - Context object to sanitize
 * @param depth - Current recursion depth (default: 0)
 * @param maxDepth - Maximum recursion depth (default: MAX_SANITIZATION_DEPTH)
 * @returns Sanitized context object
 */
export function sanitizeContext(
  context: LogContext,
  depth: number = 0,
  maxDepth: number = MAX_SANITIZATION_DEPTH,
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

  for (const key in context) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

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
   * Uses Sentry as the primary error tracking service, with LogRocket fallback
   */
  private sendToErrorTracking(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ): void {
    const sanitizedContext = sanitizeContext(context || {});
    const errorToCapture = error instanceof Error ? error : new Error(message);

    // Sentry integration (primary)
    try {
      Sentry.withScope((scope) => {
        scope.setTag("source", "logger");
        scope.setExtra("message", message);
        scope.setExtra("context", sanitizedContext);
        Sentry.captureException(errorToCapture);
      });
    } catch {
      // Sentry not available, continue to fallback
    }

    // LogRocket integration (secondary)
    const errorTrackingService = process.env.NEXT_PUBLIC_ERROR_TRACKING_SERVICE;
    if (errorTrackingService === "logrocket") {
      try {
        if (typeof window !== "undefined" && (window as { LogRocket?: { captureException?: (error: unknown, options?: unknown) => void } }).LogRocket) {
          const LogRocket = (window as unknown as { LogRocket: { captureException: (error: unknown, options?: unknown) => void } }).LogRocket;
          LogRocket.captureException(errorToCapture, {
            tags: {
              source: "logger",
            },
            extra: {
              message,
              context: sanitizedContext,
            },
          });
          return;
        }
      } catch {
        // LogRocket not available
      }
    }

    // Fallback: Log structured error for potential log aggregation (Vercel, etc.)
    if (process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === "true" || errorTrackingService) {
      console.error("[ERROR_TRACKING]", {
        message,
        error: error instanceof Error ? error.message : String(error),
        context: sanitizedContext,
        service: errorTrackingService || "console",
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();
