import { defineType } from "sanity";

export const locationRef = defineType({
  name: "locationRef",
  title: "Location Reference",
  type: "object",
  fields: [
    {
      name: "locationId",
      title: "Location ID",
      type: "string",
      description: "Supabase location ID (UUID)",
      validation: (rule) => rule.required(),
    },
    {
      name: "label",
      title: "Display Label",
      type: "string",
      description: "Optional override for the location name",
    },
  ],
  preview: {
    select: {
      locationId: "locationId",
      label: "label",
    },
    prepare({ locationId, label }) {
      return {
        title: label || locationId || "Unknown Location",
      };
    },
  },
});
