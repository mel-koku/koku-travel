import { defineArrayMember, defineField, defineType } from "sanity";

const timeOfDayOptions = [
  { title: "Morning", value: "morning" },
  { title: "Afternoon", value: "afternoon" },
  { title: "Evening", value: "evening" },
];

export const itineraryActivity = defineType({
  name: "itineraryActivity",
  title: "Activity",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      options: {
        list: [
          { title: "Place", value: "place" },
          { title: "Note", value: "note" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "timeOfDay",
      title: "Time of Day",
      type: "string",
      options: { list: timeOfDayOptions, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "durationMin",
      title: "Duration (minutes)",
      type: "number",
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: "neighborhood",
      title: "Neighborhood",
      type: "string",
    }),
    defineField({
      name: "destination",
      title: "Destination",
      type: "reference",
      to: [{ type: "destination" }],
      options: { disableNew: true },
      hidden: ({ parent }) => parent?.kind === "note",
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "timeOfDay",
    },
  },
});

export const itineraryDay = defineType({
  name: "itineraryDay",
  title: "Day",
  type: "object",
  fields: [
    defineField({
      name: "dateLabel",
      title: "Label",
      type: "string",
      description: "Optional label such as 'Day 1 (Kyoto)'.",
    }),
    defineField({
      name: "activities",
      title: "Activities",
      type: "array",
      of: [defineArrayMember({ type: "itineraryActivity" })],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: {
      title: "dateLabel",
    },
    prepare({ title }) {
      return {
        title: title || "Day",
      };
    },
  },
});

export const itinerary = defineType({
  name: "itinerary",
  title: "Itinerary",
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
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "durationDays",
      title: "Duration (days)",
      type: "number",
      validation: (rule) => rule.min(1).max(30),
    }),
    defineField({
      name: "guide",
      title: "Guide",
      type: "reference",
      to: [{ type: "guide" }],
      options: { disableNew: true },
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
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "days",
      title: "Days",
      type: "array",
      of: [defineArrayMember({ type: "itineraryDay" })],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "lastPublishedAt",
      title: "Last Published",
      type: "datetime",
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "summary",
      media: "heroImage",
    },
  },
});

