import { defineType, defineField } from "sanity";

export const culturalPillar = defineType({
  name: "culturalPillar",
  title: "Cultural Pillar",
  type: "document",
  orderings: [
    {
      title: "Sort Order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: 'English name, e.g. "Wa"',
      validation: (rule) => rule.required().max(30),
    }),
    defineField({
      name: "japanese",
      title: "Japanese",
      type: "string",
      description: 'Japanese characters, e.g. "和"',
      validation: (rule) => rule.required().max(10),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 30 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "pronunciation",
      title: "Pronunciation",
      type: "string",
      description: "Phonetic guide",
      validation: (rule) => rule.required().max(50),
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      description: "One-line hook",
      validation: (rule) =>
        rule
          .required()
          .max(100)
          .custom((val) => {
            if (typeof val === "string" && /--|—/.test(val))
              return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
            return true;
          }),
    }),
    defineField({
      name: "concept",
      title: "Concept",
      type: "text",
      rows: 3,
      description: "What this principle means (max 300 chars)",
      validation: (rule) =>
        rule
          .required()
          .max(300)
          .custom((val) => {
            if (typeof val === "string" && /--|—/.test(val))
              return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
            return true;
          }),
    }),
    defineField({
      name: "inPractice",
      title: "In Practice",
      type: "text",
      rows: 3,
      description: "How it shows up in daily Japanese life (max 400 chars)",
      validation: (rule) =>
        rule
          .required()
          .max(400)
          .custom((val) => {
            if (typeof val === "string" && /--|—/.test(val))
              return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
            return true;
          }),
    }),
    defineField({
      name: "forTravelers",
      title: "For Travelers",
      type: "text",
      rows: 3,
      description: "What this means for visitors (max 400 chars)",
      validation: (rule) =>
        rule
          .required()
          .max(400)
          .custom((val) => {
            if (typeof val === "string" && /--|—/.test(val))
              return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
            return true;
          }),
    }),
    defineField({
      name: "briefIntro",
      title: "Brief Intro",
      type: "text",
      rows: 2,
      description: "Card collapsed state (max 200 chars)",
      validation: (rule) =>
        rule
          .required()
          .max(200)
          .custom((val) => {
            if (typeof val === "string" && /--|—/.test(val))
              return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
            return true;
          }),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      description: "Emoji or Lucide icon name",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      validation: (rule) => rule.required().min(1).max(10),
    }),
    defineField({
      name: "behaviors",
      title: "Behaviors",
      type: "array",
      validation: (rule) => rule.min(1),
      of: [
        {
          type: "object",
          preview: {
            select: {
              severity: "severity",
              situation: "situation",
            },
            prepare({ severity, situation }) {
              const emoji =
                severity === "critical"
                  ? "🔴"
                  : severity === "important"
                    ? "🟡"
                    : "🟢";
              return {
                title: `${emoji} ${situation || "Untitled"}`,
              };
            },
          },
          fields: [
            defineField({
              name: "situation",
              title: "Situation",
              type: "string",
              validation: (rule) =>
                rule
                  .required()
                  .max(100)
                  .custom((val) => {
                    if (typeof val === "string" && /--|—/.test(val))
                      return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
                    return true;
                  }),
            }),
            defineField({
              name: "action",
              title: "Action",
              type: "text",
              rows: 2,
              validation: (rule) =>
                rule
                  .required()
                  .max(300)
                  .custom((val) => {
                    if (typeof val === "string" && /--|—/.test(val))
                      return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
                    return true;
                  }),
            }),
            defineField({
              name: "why",
              title: "Why",
              type: "text",
              rows: 2,
              validation: (rule) =>
                rule
                  .required()
                  .max(300)
                  .custom((val) => {
                    if (typeof val === "string" && /--|—/.test(val))
                      return 'Remove em-dashes ("--" or "—"). Use a period or two sentences instead.';
                    return true;
                  }),
            }),
            defineField({
              name: "categories",
              title: "Categories",
              type: "array",
              of: [{ type: "string" }],
              options: { layout: "tags" },
            }),
            defineField({
              name: "severity",
              title: "Severity",
              type: "string",
              validation: (rule) => rule.required(),
              options: {
                list: [
                  { title: "Critical", value: "critical" },
                  { title: "Important", value: "important" },
                  { title: "Nice to Know", value: "nice_to_know" },
                ],
              },
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      japanese: "japanese",
      name: "name",
    },
    prepare({ japanese, name }) {
      return {
        title: `${japanese || ""} ${name || ""}`.trim(),
        subtitle: "Cultural Pillar",
      };
    },
  },
});
