import { defineType, defineField } from "sanity";

export const commerceDisclosure = defineType({
  name: "commerceDisclosure",
  title: "Commerce Disclosure",
  type: "document",
  fieldsets: [
    { name: "business", title: "Business Information", options: { collapsible: true, collapsed: false } },
    { name: "service", title: "Service & Pricing", options: { collapsible: true, collapsed: true } },
    { name: "cancellation", title: "Cancellations & Returns", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    // ── Business Information ──────────────────────
    defineField({
      name: "businessName",
      title: "Business Name",
      type: "string",
      fieldset: "business",
      initialValue: "Yuku Japan",
    }),
    defineField({
      name: "representative",
      title: "Representative (Your Name)",
      type: "string",
      fieldset: "business",
      initialValue: "Mel Jun Picardal",
    }),
    defineField({
      name: "address",
      title: "Business Address",
      type: "text",
      rows: 3,
      fieldset: "business",
      description: "Your virtual office address once registered. Leave blank until confirmed.",
      placeholder: "e.g. 1-2-3 Shinjuku, Shinjuku-ku, Tokyo 160-0022",
    }),
    defineField({
      name: "email",
      title: "Contact Email",
      type: "string",
      fieldset: "business",
      initialValue: "hello@yukujapan.com",
    }),
    defineField({
      name: "phone",
      title: "Phone Number",
      type: "string",
      fieldset: "business",
      description: "Optional. Required by law if you have one.",
    }),
    defineField({
      name: "businessType",
      title: "Business Type Description",
      type: "string",
      fieldset: "business",
      initialValue: "Online travel planning platform (sole proprietor)",
    }),

    // ── Service & Pricing ─────────────────────────
    defineField({
      name: "serviceDescription",
      title: "Service Description",
      type: "text",
      rows: 3,
      fieldset: "service",
      initialValue:
        "Yuku Japan is a digital travel planning service providing AI-generated itineraries, curated guides, and destination content for travel in Japan.",
    }),
    defineField({
      name: "pricingDescription",
      title: "Pricing Description",
      type: "string",
      fieldset: "service",
      initialValue:
        "Trip Pass: displayed at checkout prior to purchase. All prices are shown in Japanese Yen (JPY) inclusive of applicable taxes.",
    }),
    defineField({
      name: "paymentMethods",
      title: "Payment Methods",
      type: "string",
      fieldset: "service",
      initialValue:
        "Credit card and debit card (Visa, Mastercard, American Express, JCB) via Stripe.",
    }),
    defineField({
      name: "paymentTiming",
      title: "Payment Timing",
      type: "string",
      fieldset: "service",
      initialValue: "Payment is charged at the time of purchase.",
    }),
    defineField({
      name: "deliveryDescription",
      title: "Service Delivery",
      type: "string",
      fieldset: "service",
      initialValue:
        "Digital access is granted immediately upon successful payment confirmation. No physical goods are shipped.",
    }),

    // ── Cancellations & Returns ───────────────────
    defineField({
      name: "cancellationPolicy",
      title: "Cancellation Policy",
      type: "text",
      rows: 4,
      fieldset: "cancellation",
      initialValue:
        "Because Yuku Japan provides digital content that is made available immediately upon purchase, we are unable to offer refunds once access has been granted, except where required by applicable law.",
    }),
    defineField({
      name: "cancellationContact",
      title: "Cancellation Contact Note",
      type: "text",
      rows: 2,
      fieldset: "cancellation",
      initialValue:
        "If you experience a technical issue that prevents access to a purchased service, please contact us and we will work to resolve it promptly.",
    }),
  ],
  preview: {
    prepare() {
      return { title: "Commerce Disclosure" };
    },
  },
});
