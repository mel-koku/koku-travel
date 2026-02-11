import { defineType, defineField } from "sanity";

export const landingPage = defineType({
  name: "landingPage",
  title: "Landing Page",
  type: "document",
  fieldsets: [
    { name: "hero", title: "Hero Section", options: { collapsible: true } },
    { name: "philosophy", title: "Philosophy Section", options: { collapsible: true } },
    { name: "showcase", title: "Showcase Section", options: { collapsible: true } },
    { name: "featuredLocations", title: "Featured Locations Section", options: { collapsible: true } },
    { name: "featuredExperiences", title: "Featured Experiences Section", options: { collapsible: true } },
    { name: "testimonials", title: "Testimonials Section", options: { collapsible: true } },
    { name: "featuredGuides", title: "Featured Guides Section", options: { collapsible: true } },
    { name: "finalCta", title: "Final CTA Section", options: { collapsible: true } },
  ],
  fields: [
    // ── Hero ──────────────────────────────────────
    defineField({
      name: "heroTagline",
      title: "Tagline",
      type: "string",
      fieldset: "hero",
      initialValue: "Beyond the guidebook",
    }),
    defineField({
      name: "heroDescription",
      title: "Description",
      type: "text",
      rows: 2,
      fieldset: "hero",
      initialValue: "Explore {locationCount}+ places curated by people who actually live here.",
      description: "Use {locationCount} as a placeholder for the dynamic count",
    }),
    defineField({
      name: "heroPrimaryCtaText",
      title: "Primary CTA Text",
      type: "string",
      fieldset: "hero",
      initialValue: "Start Planning",
    }),
    defineField({
      name: "heroSecondaryCtaText",
      title: "Secondary CTA Text",
      type: "string",
      fieldset: "hero",
      initialValue: "Browse Locations",
    }),
    defineField({
      name: "heroImage",
      title: "Hero Background Image",
      type: "image",
      options: { hotspot: true },
      fieldset: "hero",
    }),

    // ── Philosophy ───────────────────────────────
    defineField({
      name: "philosophyEyebrow",
      title: "Eyebrow Text",
      type: "string",
      fieldset: "philosophy",
      initialValue: "Locally sourced, locally verified",
    }),
    defineField({
      name: "philosophyHeading",
      title: "Heading",
      type: "string",
      fieldset: "philosophy",
      initialValue: "Not from a desk, but from years of living here.",
    }),
    defineField({
      name: "philosophyImage",
      title: "Background Image",
      type: "image",
      options: { hotspot: true },
      fieldset: "philosophy",
    }),
    defineField({
      name: "philosophyStats",
      title: "Stats",
      type: "array",
      fieldset: "philosophy",
      of: [
        {
          type: "object",
          name: "stat",
          title: "Stat",
          fields: [
            defineField({
              name: "value",
              title: "Value",
              type: "string",
              description: "e.g. '47', '100%'. Use {locationCount} for dynamic count.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "suffix",
              title: "Suffix",
              type: "string",
              description: "e.g. '+' after the number",
            }),
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              description: "e.g. 'Places', 'Prefectures', 'Local'",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { value: "value", suffix: "suffix", label: "label" },
            prepare({ value, suffix, label }) {
              return { title: `${value}${suffix || ""} ${label}` };
            },
          },
        },
      ],
      validation: (rule) => rule.max(4),
    }),

    // ── Showcase ─────────────────────────────────
    defineField({
      name: "showcaseActs",
      title: "Showcase Acts",
      type: "array",
      fieldset: "showcase",
      of: [
        {
          type: "object",
          name: "showcaseAct",
          title: "Act",
          fields: [
            defineField({
              name: "number",
              title: "Number",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "eyebrow",
              title: "Eyebrow",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "text",
              rows: 3,
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "alt",
              title: "Image Alt Text",
              type: "string",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { number: "number", eyebrow: "eyebrow", title: "title" },
            prepare({ number, eyebrow, title }) {
              return { title: `${number} — ${eyebrow}`, subtitle: title };
            },
          },
        },
      ],
      validation: (rule) => rule.length(3),
    }),

    // ── Featured Locations ───────────────────────
    defineField({
      name: "featuredLocationsEyebrow",
      title: "Eyebrow",
      type: "string",
      fieldset: "featuredLocations",
      initialValue: "Editor's Picks",
    }),
    defineField({
      name: "featuredLocationsHeading",
      title: "Heading",
      type: "string",
      fieldset: "featuredLocations",
      initialValue: "Places that stay with you",
    }),
    defineField({
      name: "featuredLocationsDescription",
      title: "Description",
      type: "text",
      rows: 2,
      fieldset: "featuredLocations",
      initialValue:
        "Handpicked locations that represent the best of Japan — from hidden shrines to neighborhood favorites.",
    }),

    // ── Featured Experiences ────────────────────────
    defineField({
      name: "featuredExperiencesEyebrow",
      title: "Eyebrow",
      type: "string",
      fieldset: "featuredExperiences",
      initialValue: "Experiences",
    }),
    defineField({
      name: "featuredExperiencesHeading",
      title: "Heading",
      type: "string",
      fieldset: "featuredExperiences",
      initialValue: "Go beyond sightseeing",
    }),
    defineField({
      name: "featuredExperiencesDescription",
      title: "Description",
      type: "text",
      rows: 2,
      fieldset: "featuredExperiences",
      initialValue:
        "Workshops, cruises, and adventures that connect you with the culture — not just the scenery.",
    }),

    // ── Testimonials ─────────────────────────────
    defineField({
      name: "testimonials",
      title: "Testimonials",
      type: "array",
      fieldset: "testimonials",
      of: [
        {
          type: "object",
          name: "testimonial",
          title: "Testimonial",
          fields: [
            defineField({
              name: "quote",
              title: "Quote",
              type: "text",
              rows: 3,
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "authorName",
              title: "Author Name",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "authorLocation",
              title: "Author Location",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "alt",
              title: "Image Alt Text",
              type: "string",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { author: "authorName", location: "authorLocation" },
            prepare({ author, location }) {
              return { title: author, subtitle: location };
            },
          },
        },
      ],
      validation: (rule) => rule.min(1).max(5),
    }),

    // ── Featured Guides ──────────────────────────
    defineField({
      name: "featuredGuidesEyebrow",
      title: "Eyebrow",
      type: "string",
      fieldset: "featuredGuides",
      initialValue: "Travel Guides",
    }),
    defineField({
      name: "featuredGuidesHeading",
      title: "Heading",
      type: "string",
      fieldset: "featuredGuides",
      initialValue: "Start reading",
    }),
    defineField({
      name: "featuredGuidesDescription",
      title: "Description",
      type: "text",
      rows: 2,
      fieldset: "featuredGuides",
      initialValue:
        "Local insights, seasonal tips, and curated itineraries to help you plan a trip that goes beyond the surface.",
    }),

    // ── Final CTA ────────────────────────────────
    defineField({
      name: "finalCtaHeading",
      title: "Heading",
      type: "string",
      fieldset: "finalCta",
      initialValue: "Your Japan is waiting",
    }),
    defineField({
      name: "finalCtaDescription",
      title: "Description",
      type: "string",
      fieldset: "finalCta",
      initialValue: "Every trip starts with a single place. Find yours.",
    }),
    defineField({
      name: "finalCtaPrimaryText",
      title: "Primary CTA Text",
      type: "string",
      fieldset: "finalCta",
      initialValue: "Start Planning",
    }),
    defineField({
      name: "finalCtaSecondaryText",
      title: "Secondary CTA Text",
      type: "string",
      fieldset: "finalCta",
      initialValue: "Browse Locations",
    }),
    defineField({
      name: "finalCtaSubtext",
      title: "Subtext",
      type: "string",
      fieldset: "finalCta",
      initialValue: "Free to use. No account required.",
    }),
    defineField({
      name: "finalCtaImage",
      title: "Background Image",
      type: "image",
      options: { hotspot: true },
      fieldset: "finalCta",
    }),
  ],
  preview: {
    prepare() {
      return { title: "Landing Page" };
    },
  },
});
