/**
 * Next.js Instrumentation Hook
 * This file is automatically executed by Next.js when experimental.instrumentationHook is enabled.
 * It's used to initialize Sentry for server-side and edge runtime error tracking.
 * 
 * For Sentry v10.25.0+, this is the recommended way to load sentry.server.config.ts
 * and sentry.edge.config.ts files. These config files won't be auto-imported anymore,
 * so we need to explicitly import them here.
 */

export async function register() {
  // Only run in server/edge environments
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import server-side Sentry configuration
    // This will execute the Sentry.init() call in sentry.server.config.ts
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Import edge runtime Sentry configuration
    // This will execute the Sentry.init() call in sentry.edge.config.ts
    await import("../sentry.edge.config");
  }
}

