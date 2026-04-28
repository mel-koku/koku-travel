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
        "Going to Japan should feel as good as being there. Yuku (\u884C\u304F) means \u201Cto go.\u201D We built this for the going.",
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
        "Japan rewards the traveler who goes deeper. A tonkatsu shop three blocks from the station. A mountain shrine that empties out by mid-afternoon. The quiet prefecture most itineraries skip.",
        "These moments take planning, not luck. Yuku does the planning, with the depth and care of a concierge who already knows the country.",
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
          title: "A trip, not a research project.",
          description:
            "Planning Japan can eat weeks of evenings and fifty open tabs. Yuku handles the routing, the train timing, and the sequencing in one place, so you can spend those evenings looking forward to it instead.",
        },
        {
          _type: "object",
          title: "Beyond the algorithm.",
          description:
            "Most itineraries circle the same four cities. Yuku draws from official tourism boards across every region, so the quiet prefectures earn their place too.",
        },
        {
          _type: "object",
          title: "Travel with the grain.",
          description:
            "Most friction between visitors and locals comes from missing context, not bad intent. Yuku briefs you on the etiquette, the timing, and the unspoken rules of a place, so you arrive ready.",
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
      initialValue: "Build my trip",
    }),
  ],
  preview: {
    prepare() {
      return { title: "About Page" };
    },
  },
});
