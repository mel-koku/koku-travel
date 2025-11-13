const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";
const apiVersion = process.env.SANITY_API_VERSION || "2024-10-21";

if (!projectId) {
  throw new Error(
    "[sanity] Missing SANITY_PROJECT_ID. Add it to your environment (see env.local.example).",
  );
}

export const sanityConfig = {
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production" && !process.env.SANITY_API_READ_TOKEN,
};

