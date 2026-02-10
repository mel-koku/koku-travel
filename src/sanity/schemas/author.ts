import { defineType, defineField } from "sanity";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
      description: "Where this author is based (e.g., Kyoto, Tokyo)",
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "object",
      fields: [
        { name: "twitter", title: "Twitter / X", type: "url" },
        { name: "instagram", title: "Instagram", type: "url" },
        { name: "website", title: "Website", type: "url" },
      ],
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "city",
      media: "photo",
    },
  },
});
