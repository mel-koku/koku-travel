import { defineCliConfig } from "sanity/cli";

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";

if (!projectId) {
  throw new Error(
    "Missing SANITY_PROJECT_ID. Update your environment variables before running Sanity CLI commands.",
  );
}

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
});

