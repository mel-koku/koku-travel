const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";
const apiVersion = process.env.SANITY_API_VERSION || "2024-10-21";

/**
 * Validates that required Sanity environment variables are set.
 * This is called at runtime when the client is actually used, not during build.
 */
export function validateSanityConfig(): void {
  if (!projectId) {
    throw new Error(
      "[sanity] Missing SANITY_PROJECT_ID. Add it to your environment (see env.local.example).",
    );
  }
}

// Allow config to be created even without projectId during build time
// Validation will happen at runtime when the client is actually used
export const sanityConfig = {
  projectId: projectId || "", // Empty string as fallback for build time
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production" && !process.env.SANITY_API_READ_TOKEN,
};

