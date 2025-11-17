import { defineField, defineType } from "sanity";

/**
 * Place schema for caching Google Places data in Sanity
 */
export const place = defineType({
  name: "place",
  title: "Place",
  type: "document",
  fields: [
    defineField({
      name: "placeId",
      title: "Google Place ID",
      type: "string",
      validation: (rule) => rule.required(),
      description: "Unique identifier from Google Places API",
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "coordinates",
      title: "Coordinates",
      type: "object",
      fields: [
        defineField({
          name: "lat",
          title: "Latitude",
          type: "number",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "lng",
          title: "Longitude",
          type: "number",
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: "formattedAddress",
      title: "Formatted Address",
      type: "string",
    }),
    defineField({
      name: "openingHours",
      title: "Opening Hours",
      type: "array",
      of: [{ type: "string" }],
      description: "Opening hours as weekday descriptions",
    }),
    defineField({
      name: "rating",
      title: "Rating",
      type: "number",
      validation: (rule) => rule.min(0).max(5),
    }),
    defineField({
      name: "reviewCount",
      title: "Review Count",
      type: "number",
    }),
    defineField({
      name: "reviews",
      title: "Reviews",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "authorName",
              title: "Author Name",
              type: "string",
            }),
            defineField({
              name: "rating",
              title: "Rating",
              type: "number",
            }),
            defineField({
              name: "text",
              title: "Review Text",
              type: "text",
            }),
            defineField({
              name: "relativePublishTimeDescription",
              title: "Publish Time",
              type: "string",
            }),
          ],
        },
      ],
    }),
    defineField({
      name: "lastSynced",
      title: "Last Synced",
      type: "datetime",
      description: "When this place was last synced from Google Places API",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "metadata",
      title: "Metadata",
      type: "object",
      fields: [
        defineField({
          name: "websiteUri",
          title: "Website URI",
          type: "url",
        }),
        defineField({
          name: "phoneNumber",
          title: "Phone Number",
          type: "string",
        }),
        defineField({
          name: "googleMapsUri",
          title: "Google Maps URI",
          type: "url",
        }),
        defineField({
          name: "editorialSummary",
          title: "Editorial Summary",
          type: "text",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "formattedAddress",
    },
  },
});

