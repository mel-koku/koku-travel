import { createClient } from "next-sanity";

import { sanityConfig } from "./config";

const token = process.env.SANITY_API_READ_TOKEN;

export const sanityClient = createClient({
  ...sanityConfig,
  token,
  perspective: "published",
});

export function getPreviewClient(sessionToken?: string) {
  return createClient({
    ...sanityConfig,
    useCdn: false,
    token: sessionToken ?? token,
    perspective: "previewDrafts",
  });
}

