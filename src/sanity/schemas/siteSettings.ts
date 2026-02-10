import { defineType, defineField } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Footer & Settings",
  type: "document",
  fields: [
    defineField({
      name: "brandDescription",
      title: "Brand Tagline",
      type: "string",
      description: "Short brand description shown in footer",
      initialValue: "Curated by people who know Japan from the inside.",
    }),
    defineField({
      name: "newsletterLabel",
      title: "Newsletter Label",
      type: "string",
      initialValue: "Get the inside track",
    }),
    defineField({
      name: "newsletterButtonText",
      title: "Newsletter Button Text",
      type: "string",
      initialValue: "Sign me up",
    }),
    defineField({
      name: "footerNavColumns",
      title: "Footer Navigation Columns",
      type: "array",
      of: [
        {
          type: "object",
          name: "navColumn",
          title: "Navigation Column",
          fields: [
            defineField({
              name: "title",
              title: "Column Title",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "links",
              title: "Links",
              type: "array",
              of: [
                {
                  type: "object",
                  name: "navLink",
                  title: "Link",
                  fields: [
                    defineField({
                      name: "label",
                      title: "Label",
                      type: "string",
                      validation: (rule) => rule.required(),
                    }),
                    defineField({
                      name: "href",
                      title: "URL",
                      type: "string",
                      validation: (rule) => rule.required(),
                    }),
                  ],
                  preview: {
                    select: { title: "label", subtitle: "href" },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: { title: "title" },
          },
        },
      ],
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "array",
      of: [
        {
          type: "object",
          name: "socialLink",
          title: "Social Link",
          fields: [
            defineField({
              name: "platform",
              title: "Platform",
              type: "string",
              options: {
                list: [
                  { title: "Instagram", value: "instagram" },
                  { title: "X / Twitter", value: "twitter" },
                  { title: "YouTube", value: "youtube" },
                  { title: "TikTok", value: "tiktok" },
                  { title: "Facebook", value: "facebook" },
                ],
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "url",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "label",
              title: "Display Label",
              type: "string",
              description: "Short label shown in footer (e.g., IG, X, YT)",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: "label", subtitle: "platform" },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Footer & Settings" };
    },
  },
});
