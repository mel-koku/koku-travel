import type { Metadata } from "next";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";

import {
  ConciergeHero,
  ConciergeIntro,
  ConciergeIncludes,
  ConciergeInquiryForm,
  ConciergeFAQ,
  ConciergeFinalCTA,
} from "@/components/concierge";

export const metadata: Metadata = {
  title: "Yuku Concierge | White-Glove Trip Planning for Japan",
  description:
    "Bespoke itinerary design, native Japanese coordinator, reservation bookings, and priority support \u2014 everything short of boarding the plane with you.",
  alternates: {
    canonical: "/concierge",
  },
  openGraph: {
    title: "Yuku Concierge | White-Glove Trip Planning for Japan",
    description:
      "Bespoke itinerary design, native Japanese coordinator, reservation bookings, and priority support \u2014 everything short of boarding the plane with you.",
    siteName: "Yuku Japan",
    type: "website",
    url: "/concierge",
    images: DEFAULT_OG_IMAGES,
  },
};

export const revalidate = 3600;

export default function ConciergePage() {
  return (
    <main className="flex flex-col">
      <ConciergeHero />
      <ConciergeIntro />
      <ConciergeIncludes />
      <ConciergeInquiryForm />
      <ConciergeFAQ />
      <ConciergeFinalCTA />
    </main>
  );
}
