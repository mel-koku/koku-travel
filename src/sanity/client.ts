import { createClient } from "next-sanity";

// Fall back to placeholders so module import does not throw when env vars
// are missing (CI builds without secrets, fresh clones, dependabot PRs).
// Runtime behaviour is unchanged when real values are present (Vercel,
// local dev with .env.local). Queries against a placeholder projectId will
// fail at fetch time, and callers already degrade gracefully per
// CLAUDE.md "site never breaks if Sanity unreachable".
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "placeholder-project";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.SANITY_API_VERSION || "2026-02-10";

/** Public CDN client for read-only fetches on detail pages */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

/** Authenticated server client for webhooks and mutations */
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
});
