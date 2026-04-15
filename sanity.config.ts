import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "@/sanity/schemas";
import { deskStructure } from "@/sanity/structure";
import { resolveDocumentActions } from "@/sanity/actions";

export default defineConfig({
  name: "yuku-japan",
  title: "Yuku Japan",

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  basePath: "/studio",

  plugins: [
    structureTool({
      structure: deskStructure,
    }),
    visionTool({
      defaultApiVersion: "2026-02-10",
    }),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: resolveDocumentActions,
    newDocumentOptions: (prev) =>
      prev.filter(
        (item) =>
          !["siteSettings", "landingPage", "tripBuilderConfig", "pagesContent", "aboutPage"].includes(
            item.templateId
          )
      ),
  },
});
