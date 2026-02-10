import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "@/sanity/schemas";
import { deskStructure } from "@/sanity/structure";
import { resolveDocumentActions } from "@/sanity/actions";

export default defineConfig({
  name: "koku-travel",
  title: "Koku Travel",

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  basePath: "/studio",

  plugins: [
    structureTool({
      structure: deskStructure,
    }),
    visionTool({
      defaultApiVersion: "2024-10-21",
    }),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: resolveDocumentActions,
  },
});
