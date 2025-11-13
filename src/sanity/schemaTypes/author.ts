import { defineField, defineType } from "sanity";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Full Name",
      type: "string",
      validation: (rule) => rule.required().min(2),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
        slugify: (input) =>
          input
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 96),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "bio",
      title: "Biography",
      type: "text",
      rows: 4,
      description: "A detailed biography about the author/expert",
      validation: (rule) => rule.required().min(50),
    }),
    // Deprecated: Use 'bio' instead
    defineField({
      name: "experience",
      title: "Experience (Deprecated)",
      type: "text",
      rows: 4,
      description: "DEPRECATED: Use 'Biography' instead. This field exists for backward compatibility.",
      hidden: true, // Hide from UI but allow in schema
    }),
    defineField({
      name: "expertise",
      title: "Areas of Expertise",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
      description: "List the author's areas of expertise (e.g., 'Temple Architecture', 'Food Culture')",
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "languages",
      title: "Languages Spoken",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "English", value: "English" },
          { title: "Japanese", value: "Japanese" },
          { title: "Mandarin", value: "Mandarin" },
          { title: "Spanish", value: "Spanish" },
          { title: "French", value: "French" },
          { title: "Korean", value: "Korean" },
        ],
      },
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "avatar",
      title: "Avatar Image",
      type: "image",
      options: { hotspot: true },
      description: "Profile picture of the author",
      validation: (rule) => rule.required(),
    }),
    // Deprecated: Use 'avatar' instead
    defineField({
      name: "profileImage",
      title: "Profile Image (Deprecated)",
      type: "image",
      options: { hotspot: true },
      description: "DEPRECATED: Use 'Avatar Image' instead. This field exists for backward compatibility.",
      hidden: true, // Hide from UI but allow in schema
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      description: "Cover image for the author's profile page (optional)",
    }),
    defineField({
      name: "location",
      title: "Primary Location",
      type: "string",
      description: "City or region where the author primarily operates (e.g., 'Kyoto, Japan')",
    }),
    defineField({
      name: "yearsExperience",
      title: "Years of Experience",
      type: "number",
      description: "Number of years of experience in their field",
      validation: (rule) => rule.min(0).max(100),
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "location",
      media: "avatar",
    },
  },
});

