import { defineType } from "sanity";

export const tipCallout = defineType({
  name: "tipCallout",
  title: "Tip Callout",
  type: "object",
  fields: [
    {
      name: "tipType",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Pro Tip", value: "pro_tip" },
          { title: "Cultural Note", value: "cultural" },
          { title: "Budget Tip", value: "budget" },
          { title: "Warning", value: "warning" },
          { title: "Seasonal", value: "seasonal" },
        ],
      },
      validation: (rule) => rule.required(),
    },
    {
      name: "title",
      title: "Title",
      type: "string",
    },
    {
      name: "body",
      title: "Body",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    },
  ],
  preview: {
    select: {
      title: "title",
      tipType: "tipType",
    },
    prepare({ title, tipType }) {
      const icons: Record<string, string> = {
        pro_tip: "💡",
        cultural: "🏯",
        budget: "💰",
        warning: "⚠️",
        seasonal: "🌸",
      };
      return {
        title: title || tipType || "Tip",
        subtitle: icons[tipType] || "",
      };
    },
  },
});
