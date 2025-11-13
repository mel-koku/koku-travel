import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";

import { deskStructure } from "./src/sanity/desk/structure";
import { schemaTypes } from "./src/sanity/schemaTypes";

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";

if (!projectId) {
  throw new Error(
    "Missing SANITY_PROJECT_ID. Set it in your environment to run the Studio.",
  );
}

export default defineConfig({
  name: "default",
  title: "Koku Travel Studio",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [
    deskTool({
      structure: deskStructure,
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
});

