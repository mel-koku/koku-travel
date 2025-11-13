import { defineArrayMember, defineField, defineType } from "sanity";

export const blogPost = defineType({
  name: "blogPost",
  title: "Blog Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(240),
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "guide" }],
      options: { disableNew: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "destinations",
      title: "Destinations",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "destination" }],
          options: { disableNew: true },
        }),
      ],
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "blockContent",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "seoDescription",
      title: "SEO Description",
      type: "string",
      validation: (rule) => rule.max(160),
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

