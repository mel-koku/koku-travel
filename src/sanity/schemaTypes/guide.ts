import { defineField, defineType } from "sanity";

export const guide = defineType({
  name: "guide",
  title: "Guide",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description:
        "The title of the guide (e.g., 'A Day in Kyoto's Temples')",
      validation: (rule) => rule.required().min(3).max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 96),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      description: "The author/expert who created this guide",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "headline",
      title: "Headline",
      type: "string",
      description:
        "Short description that appears on cards (e.g. 'A day in Kyoto's temples').",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      description: "Brief summary of the guide (max 240 characters)",
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Culture", value: "culture" },
          { title: "Food", value: "food" },
          { title: "Nature", value: "nature" },
          { title: "Nightlife", value: "nightlife" },
          { title: "Shopping", value: "shopping" },
          { title: "View", value: "view" },
        ],
      },
      validation: (rule) => rule.min(1).max(4),
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      description: "Primary city or location for this guide",
      options: {
        list: [
          { title: "Tokyo", value: "tokyo" },
          { title: "Kyoto", value: "kyoto" },
          { title: "Osaka", value: "osaka" },
          { title: "Nara", value: "nara" },
          { title: "Yokohama", value: "yokohama" },
          { title: "Hokkaido", value: "hokkaido" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      description: "Main image for this guide",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "featured",
      title: "Featured Guide",
      type: "boolean",
      description: "Whether this guide should be featured prominently",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      description: "When this guide was published (optional, defaults to creation date)",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "author.name",
      media: "coverImage",
    },
  },
});

