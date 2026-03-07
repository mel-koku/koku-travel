import { defineType, defineField } from "sanity";

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
      options: { source: "title", maxLength: 120 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "Short summary for cards and SEO (max 200 chars)",
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: "body",
      title: "Body",
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
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  {
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (rule) =>
                      rule.uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
                  },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              title: "Alt Text",
              type: "string",
              validation: (rule) => rule.required(),
            },
            {
              name: "caption",
              title: "Caption",
              type: "string",
            },
          ],
        },
        { type: "tipCallout" },
      ],
    }),
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Itineraries", value: "itineraries" },
          { title: "Food & Drink", value: "food-drink" },
          { title: "Culture", value: "culture" },
          { title: "Seasonal", value: "seasonal" },
          { title: "Budget", value: "budget" },
          { title: "Hidden Gems", value: "hidden-gems" },
          { title: "Practical Tips", value: "practical-tips" },
          { title: "Neighborhoods", value: "neighborhoods" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
      description: "Primary city (lowercase for matching)",
    }),
    defineField({
      name: "region",
      title: "Region",
      type: "string",
    }),
    defineField({
      name: "readingTimeMinutes",
      title: "Reading Time (minutes)",
      type: "number",
      validation: (rule) => rule.min(1).max(30),
    }),
    defineField({
      name: "editorialStatus",
      title: "Editorial Status",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "In Review", value: "in_review" },
          { title: "Published", value: "published" },
          { title: "Archived", value: "archived" },
        ],
      },
      initialValue: "draft",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      status: "editorialStatus",
      media: "featuredImage",
    },
    prepare({ title, author, status, media }) {
      const statusLabels: Record<string, string> = {
        draft: "Draft",
        in_review: "In Review",
        published: "Published",
        archived: "Archived",
      };
      return {
        title,
        subtitle: `${statusLabels[status] || status} — ${author || "No author"}`,
        media,
      };
    },
  },
  orderings: [
    {
      title: "Published Date",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
