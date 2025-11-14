import { createClient } from "next-sanity";

import { sanityConfig, validateSanityConfig } from "./config";

const token = process.env.SANITY_API_READ_TOKEN;

// Validate config at runtime when client is created/used
// This allows the build to succeed even if env vars are missing
function getSanityClient() {
  validateSanityConfig();
  return createClient({
    ...sanityConfig,
    token,
    perspective: "published",
  });
}

// Lazy initialization - only create client when actually used
let _sanityClient: ReturnType<typeof createClient> | null = null;

export const sanityClient = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_sanityClient) {
      _sanityClient = getSanityClient();
    }
    const value = _sanityClient[prop as keyof typeof _sanityClient];
    return typeof value === "function" ? value.bind(_sanityClient) : value;
  },
});

export function getPreviewClient(sessionToken?: string) {
  validateSanityConfig();
  return createClient({
    ...sanityConfig,
    useCdn: false,
    token: sessionToken ?? token,
    perspective: "previewDrafts",
  });
}

