/**
 * Centralized logging utility
 * In production, this can be extended to send logs to external services (Sentry, LogRocket, etc.)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

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
   * TODO: Integrate with Sentry, LogRocket, or similar service
   */
  private sendToErrorTracking(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ): void {
    // Placeholder for error tracking integration
    // Example with Sentry:
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.captureException(error || new Error(message), {
    //   extra: context,
    //   tags: { source: "logger" },
    // });

    // For now, just log to console in production
    // In a real implementation, this would send to your error tracking service
    if (process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === "true") {
      // This would be where you'd send to your error tracking service
      // For now, we'll just ensure it's logged
    }
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Helper function to sanitize sensitive data from context
 */
export function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = { ...context };
  const sensitiveKeys = ["password", "token", "secret", "key", "authorization", "cookie"];

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}

