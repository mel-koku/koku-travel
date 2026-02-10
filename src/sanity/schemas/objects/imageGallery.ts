import { defineType } from "sanity";

export const imageGallery = defineType({
  name: "imageGallery",
  title: "Image Gallery",
  type: "object",
  fields: [
    {
      name: "images",
      title: "Images",
      type: "array",
      of: [
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
      ],
      validation: (rule) => rule.min(2).max(6),
    },
    {
      name: "layout",
      title: "Layout",
      type: "string",
      options: {
        list: [
          { title: "Grid", value: "grid" },
          { title: "Masonry", value: "masonry" },
          { title: "Side by Side", value: "side-by-side" },
        ],
      },
      initialValue: "grid",
    },
  ],
  preview: {
    select: {
      images: "images",
      layout: "layout",
    },
    prepare({ images, layout }) {
      const count = images?.length || 0;
      return {
        title: `Gallery (${count} images)`,
        subtitle: layout || "grid",
      };
    },
  },
});
