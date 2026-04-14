import { defineType, defineField } from "sanity";

export const aboutPage = defineType({
  name: "aboutPage",
  title: "About Page",
  type: "document",
  fieldsets: [
    { name: "hero", title: "Hero", options: { collapsible: true, collapsed: false } },
    { name: "story", title: "Why Yuku Exists", options: { collapsible: true, collapsed: true } },
    { name: "photoBreak", title: "Photo Break", options: { collapsible: true, collapsed: true } },
    { name: "values", title: "What We Believe", options: { collapsible: true, collapsed: true } },
    { name: "team", title: "Team", options: { collapsible: true, collapsed: true } },
    { name: "cta", title: "Closing CTA", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    // ── Hero ──────────────────────────────────────
    defineField({
      name: "heroEyebrow",
      title: "Eyebrow",
      type: "string",
      fieldset: "hero",
      initialValue: "Our Story",
    }),
    defineField({
      name: "heroHeading",
      title: "Heading",
      type: "string",
      fieldset: "hero",
      initialValue: "Built for the trips guidebooks can't plan",
    }),
    defineField({
      name: "heroSubtext",
      title: "Subtext",
      type: "text",
      rows: 3,
      fieldset: "hero",
      initialValue:
        "Yuku (\u884C\u304F) means \u201Cto go\u201D in Japanese. We built this trip planner because going to Japan should feel as good as being there.",
    }),

    // ── Story ─────────────────────────────────────
    defineField({
      name: "storyHeading",
      title: "Heading",
      type: "string",
      fieldset: "story",
      initialValue: "Why Yuku exists",
    }),
    defineField({
      name: "storyParagraphs",
      title: "Paragraphs",
      type: "array",
      fieldset: "story",
      of: [{ type: "text", rows: 4 }],
      initialValue: [
        "Japan rewards the traveler who goes deeper. The tonkatsu shop three blocks from the station. The mountain shrine that empties out by mid-afternoon. The neighborhood onsen where regulars nod hello.",
        "These moments take planning, not luck. Yuku handles the logistics: local knowledge, smart routing, and cultural context built into every trip so you show up knowing when to bow, where to stay quiet, and how to move through a neighborhood without adding to the crowd.",
      ],
    }),
    defineField({
      name: "storyImage",
      title: "Section Image",
      type: "image",
      fieldset: "story",
      options: { hotspot: true },
      description: "Optional image displayed alongside the story text.",
    }),

    // ── Photo Break ───────────────────────────────
    defineField({
      name: "photoBreakImage",
      title: "Full-width Photo",
      type: "image",
      fieldset: "photoBreak",
      options: { hotspot: true },
      description: "Cinematic full-bleed image between story and values sections.",
    }),
    defineField({
      name: "photoBreakAlt",
      title: "Alt Text",
      type: "string",
      fieldset: "photoBreak",
      initialValue: "A quiet scene in Japan",
    }),

    // ── Values ────────────────────────────────────
    defineField({
      name: "valuesHeading",
      title: "Heading",
      type: "string",
      fieldset: "values",
      initialValue: "What we believe",
    }),
    defineField({
      name: "values",
      title: "Values",
      type: "array",
      fieldset: "values",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              description: "Optional accent image for this value.",
            }),
          ],
          preview: {
            select: { title: "title" },
          },
        },
      ],
      initialValue: [
        {
          _type: "object",
          title: "Depth over breadth.",
          description:
            "A great trip isn't about checking off landmarks. It's about spending enough time in one place to feel the rhythm of it.",
        },
        {
          _type: "object",
          title: "Local knowledge first.",
          description:
            "Every location in Yuku is sourced and vetted with care. We don't scrape lists. We talk to people who live there.",
        },
        {
          _type: "object",
          title: "Planning should feel good.",
          description:
            "Trip planning is part of the journey. Yuku is designed to make that process feel exciting, not exhausting.",
        },
      ],
    }),

    // ── Team ──────────────────────────────────────
    defineField({
      name: "teamEyebrow",
      title: "Eyebrow",
      type: "string",
      fieldset: "team",
      initialValue: "The Team",
    }),
    defineField({
      name: "teamHeading",
      title: "Heading",
      type: "string",
      fieldset: "team",
      initialValue: "Who's behind Yuku",
    }),
    defineField({
      name: "teamMembers",
      title: "Team Members",
      type: "array",
      fieldset: "team",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "name", title: "Name", type: "string" }),
            defineField({ name: "role", title: "Role", type: "string" }),
            defineField({ name: "bio", title: "Bio", type: "text", rows: 3 }),
            defineField({
              name: "photo",
              title: "Photo",
              type: "image",
              options: { hotspot: true },
              description: "Optional. Falls back to line illustration if empty.",
            }),
            defineField({ name: "github", title: "GitHub URL", type: "url" }),
            defineField({ name: "linkedin", title: "LinkedIn URL", type: "url" }),
            defineField({ name: "twitter", title: "Twitter URL", type: "url" }),
            defineField({ name: "website", title: "Website URL", type: "url" }),
          ],
          preview: {
            select: { title: "name", subtitle: "role" },
          },
        },
      ],
    }),

    // ── CTA ───────────────────────────────────────
    defineField({
      name: "ctaHeading",
      title: "Heading",
      type: "string",
      fieldset: "cta",
      initialValue: "Plan your next trip",
    }),
    defineField({
      name: "ctaDescription",
      title: "Description",
      type: "string",
      fieldset: "cta",
      initialValue:
        "Tell us where you want to go and how you like to travel. Yuku handles the rest.",
    }),
    defineField({
      name: "ctaButtonText",
      title: "Button Text",
      type: "string",
      fieldset: "cta",
      initialValue: "Build My Trip",
    }),
  ],
  preview: {
    prepare() {
      return { title: "About Page" };
    },
  },
});
