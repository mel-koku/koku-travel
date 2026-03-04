import { defineType, defineField } from "sanity";

export const person = defineType({
  name: "person",
  title: "Person",
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
      options: { source: "name", maxLength: 120 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Artisan", value: "artisan" },
          { title: "Guide", value: "guide" },
          { title: "Interpreter", value: "interpreter" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "coverPhoto",
      title: "Cover Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 4,
      description: "Short bio for cards and previews (max 300 chars)",
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: "story",
      title: "Story",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              title: "Alt Text",
              type: "string",
            },
            {
              name: "caption",
              title: "Caption",
              type: "string",
            },
          ],
        },
      ],
      description: "Full story for future profile pages",
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
    }),
    defineField({
      name: "region",
      title: "Region",
      type: "string",
    }),
    defineField({
      name: "specialties",
      title: "Specialties",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "languages",
      title: "Languages",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "yearsExperience",
      title: "Years of Experience",
      type: "number",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "object",
      fields: [
        defineField({ name: "instagram", title: "Instagram", type: "url" }),
        defineField({ name: "website", title: "Website", type: "url" }),
        defineField({ name: "youtube", title: "YouTube", type: "url" }),
      ],
    }),
    defineField({
      name: "supabaseId",
      title: "Supabase ID",
      type: "string",
      description: "UUID from the people table in Supabase",
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      type: "type",
      city: "city",
      media: "photo",
    },
    prepare({ title, type, city, media }) {
      const typeLabels: Record<string, string> = {
        artisan: "Artisan",
        guide: "Guide",
        interpreter: "Interpreter",
      };
      return {
        title,
        subtitle: `${typeLabels[type] || type}${city ? ` — ${city}` : ""}`,
        media,
      };
    },
  },
});
