import { defineType } from "sanity";

export const experienceHighlight = defineType({
  name: "experienceHighlight",
  title: "Experience Highlight",
  type: "object",
  fields: [
    {
      name: "highlightType",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Key Moment", value: "key_moment" },
          { title: "Sensory", value: "sensory" },
          { title: "Practical", value: "practical" },
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
      highlightType: "highlightType",
    },
    prepare({ title, highlightType }) {
      const icons: Record<string, string> = {
        key_moment: "✨",
        sensory: "👁",
        practical: "📋",
      };
      return {
        title: title || highlightType || "Highlight",
        subtitle: icons[highlightType] || "",
      };
    },
  },
});
