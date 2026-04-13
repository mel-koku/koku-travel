import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Performance monitoring (URL + timing only, no PII).
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay sampling.
  // - replaysSessionSampleRate: 0 — DON'T record sessions where nothing
  //   went wrong. Recording happy-path sessions for 10% of all visitors
  //   regardless of cookie-consent choice was a privacy/GDPR gap (CookieBanner
  //   "Decline" should mean no analytics; replay is analytics-shaped).
  // - replaysOnErrorSampleRate: 1.0 — still capture replay around an error
  //   for debugging. Defensible under "service quality" legitimate interest.
  // Sentry Replay defaults already mask all text + inputs and block media,
  // so even error replays don't leak typed content.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Only send errors in production, or when DSN is configured
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
