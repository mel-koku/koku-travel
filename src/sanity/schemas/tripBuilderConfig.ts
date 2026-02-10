import { defineType, defineField } from "sanity";

export const tripBuilderConfig = defineType({
  name: "tripBuilderConfig",
  title: "Trip Builder Config",
  type: "document",
  fields: [
    defineField({
      name: "vibes",
      title: "Vibes",
      type: "array",
      description: "Travel style categories shown in the trip builder. IDs must match code enums.",
      of: [
        {
          type: "object",
          name: "vibe",
          title: "Vibe",
          fields: [
            defineField({
              name: "vibeId",
              title: "Vibe ID",
              type: "string",
              readOnly: true,
              description: "Must match code enum (e.g., cultural_heritage)",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "name",
              title: "Display Name",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "icon",
              title: "Icon Name",
              type: "string",
              description: "Lucide icon name (e.g., Torii, Utensils, Camera)",
            }),
            defineField({
              name: "image",
              title: "Background Image",
              type: "image",
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: { name: "name", vibeId: "vibeId" },
            prepare({ name, vibeId }) {
              return { title: name, subtitle: vibeId };
            },
          },
        },
      ],
    }),
    defineField({
      name: "regions",
      title: "Regions",
      type: "array",
      description: "Region descriptions shown in the trip builder. IDs must match code enums.",
      of: [
        {
          type: "object",
          name: "region",
          title: "Region",
          fields: [
            defineField({
              name: "regionId",
              title: "Region ID",
              type: "string",
              readOnly: true,
              description: "Must match code enum (e.g., kansai, kanto)",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "name",
              title: "Display Name",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "tagline",
              title: "Tagline",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "text",
              rows: 3,
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "highlights",
              title: "Highlights",
              type: "array",
              of: [{ type: "string" }],
              description: "Notable places in this region (shown as chips)",
            }),
            defineField({
              name: "heroImage",
              title: "Hero Image",
              type: "image",
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: { name: "name", tagline: "tagline", regionId: "regionId" },
            prepare({ name, tagline, regionId }) {
              return { title: `${name} (${regionId})`, subtitle: tagline };
            },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Trip Builder Config" };
    },
  },
});
