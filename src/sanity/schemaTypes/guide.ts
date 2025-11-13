import { defineField, defineType } from "sanity";

export const guide = defineType({
  name: "guide",
  title: "Guide",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required().min(3),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 64,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 64),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "headline",
      title: "Headline",
      type: "string",
      description:
        "Short description that appears on cards (e.g. 'A day in Kyoto’s temples').",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
        list: [
          { title: "Culture", value: "culture" },
          { title: "Food", value: "food" },
          { title: "Nature", value: "nature" },
          { title: "Nightlife", value: "nightlife" },
          { title: "Shopping", value: "shopping" },
          { title: "View", value: "view" },
        ],
      },
      validation: (rule) => rule.max(4),
    }),
    defineField({
      name: "profileImage",
      title: "Profile Image",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "languages",
      title: "Languages",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "experience",
      title: "Experience",
      type: "text",
      rows: 4,
      description: "Optional longer biography for guide detail pages.",
    }),
    defineField({
      name: "featured",
      title: "Featured Guide",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "headline",
      media: "profileImage",
    },
  },
});

