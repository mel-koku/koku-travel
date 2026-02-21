import { defineType, defineField } from "sanity";

export const experience = defineType({
  name: "experience",
  title: "Experience",
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
      name: "subtitle",
      title: "Subtitle",
      type: "string",
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      description: "Short summary for cards (max 200 chars)",
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
        { type: "experienceHighlight" },
        { type: "imageGallery" },
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
      name: "thumbnailImage",
      title: "Thumbnail Image",
      type: "image",
      options: { hotspot: true },
      description: "Optional thumbnail for cards (falls back to featured image)",
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "experienceType",
      title: "Experience Type",
      type: "string",
      options: {
        list: [
          { title: "Workshop", value: "workshop" },
          { title: "Cruise", value: "cruise" },
          { title: "Tour", value: "tour" },
          { title: "Experience", value: "experience" },
          { title: "Adventure", value: "adventure" },
          { title: "Rental", value: "rental" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "duration",
      title: "Duration",
      type: "string",
      description: 'e.g. "2-3 hours", "Full day"',
    }),
    defineField({
      name: "groupSizeMin",
      title: "Group Size (Min)",
      type: "number",
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "groupSizeMax",
      title: "Group Size (Max)",
      type: "number",
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "difficulty",
      title: "Difficulty",
      type: "string",
      options: {
        list: [
          { title: "Easy", value: "easy" },
          { title: "Moderate", value: "moderate" },
          { title: "Challenging", value: "challenging" },
        ],
      },
    }),
    defineField({
      name: "bestSeason",
      title: "Best Season",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Spring", value: "spring" },
          { title: "Summer", value: "summer" },
          { title: "Autumn", value: "autumn" },
          { title: "Winter", value: "winter" },
          { title: "Year-round", value: "year-round" },
        ],
      },
    }),
    defineField({
      name: "meetingPoint",
      title: "Meeting Point",
      type: "string",
    }),
    defineField({
      name: "whatsIncluded",
      title: "What's Included",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "whatToBring",
      title: "What to Bring",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "nearestStation",
      title: "Nearest Station",
      type: "string",
    }),
    defineField({
      name: "estimatedCost",
      title: "Estimated Cost",
      type: "string",
      description: 'e.g. "From ~¥8,000"',
    }),
    defineField({
      name: "bookingUrl",
      title: "Booking URL",
      type: "url",
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
      name: "locationIds",
      title: "Linked Locations",
      type: "array",
      of: [{ type: "locationRef" }],
      description: "Supabase locations related to this experience",
    }),
    defineField({
      name: "readingTimeMinutes",
      title: "Reading Time (minutes)",
      type: "number",
      validation: (rule) => rule.min(1).max(60),
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
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      initialValue: 100,
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
      expType: "experienceType",
      media: "featuredImage",
    },
    prepare({ title, author, status, expType, media }) {
      const statusLabels: Record<string, string> = {
        draft: "📝 Draft",
        in_review: "👀 In Review",
        published: "✅ Published",
        archived: "📦 Archived",
      };
      const typeLabels: Record<string, string> = {
        workshop: "Workshop",
        cruise: "Cruise",
        tour: "Tour",
        experience: "Experience",
        adventure: "Adventure",
        rental: "Rental",
      };
      return {
        title,
        subtitle: `${typeLabels[expType] || expType} — ${statusLabels[status] || status} — ${author || "No author"}`,
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
    {
      title: "Sort Order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
  ],
});
