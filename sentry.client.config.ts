/**
 * Sentry Client Configuration
 * This file configures Sentry for client-side error tracking.
 * Sentry will only initialize if SENTRY_DSN is configured.
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Set sample rate for profiling
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Adjust this value in production, or use tracesSampler for greater control
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.1,

    // If the entire session is not sampled, use the below sample rate to sample
    // sessions when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Release tracking
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Integrations
    integrations: [
      Sentry.replayIntegration({
        // Mask all text content and user input
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Filter out errors from browser extensions
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === "object" && "message" in error) {
          const message = String(error.message);
          if (
            message.includes("Non-Error promise rejection captured") ||
            message.includes("ResizeObserver loop limit exceeded") ||
            message.includes("Non-Error exception captured")
          ) {
            return null;
          }
        }
      }
      return event;
    },
  });
}
