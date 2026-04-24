import type { Metadata } from "next";
import Image from "next/image";
import { DEFAULT_OG_IMAGES } from "@/lib/seo/defaults";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getConciergePageContent } from "@/lib/sanity/contentService";
import { cn } from "@/lib/cn";
import { typography } from "@/lib/typography-system";

import {
  ConciergeHero,
  ConciergeIncludes,
  ConciergeInquiryForm,
  ConciergeFAQ,
} from "@/components/concierge";

const PHOTO_BREAK_FALLBACK_URL = "/placeholders/concierge-photo-break.svg";
const PHOTO_BREAK_FALLBACK_ALT = "A quiet scene in Japan";

export const metadata: Metadata = {
  title: "Yuku Concierge | White-Glove Trip Planning for Japan",
  description:
    "Bespoke itinerary design, native Japanese coordinator, reservation bookings, and priority support. Everything short of boarding the plane with you.",
  alternates: {
    canonical: "/concierge",
  },
  openGraph: {
    title: "Yuku Concierge | White-Glove Trip Planning for Japan",
    description:
      "Bespoke itinerary design, native Japanese coordinator, reservation bookings, and priority support. Everything short of boarding the plane with you.",
    siteName: "Yuku Japan",
    type: "website",
    url: "/concierge",
    images: DEFAULT_OG_IMAGES,
  },
};

export const revalidate = 3600;

export default async function ConciergePage() {
  const content = (await getConciergePageContent()) ?? undefined;

  const photoBreakUrl = content?.photoBreakImage?.url ?? PHOTO_BREAK_FALLBACK_URL;
  const photoBreakAlt = content?.photoBreakAlt ?? PHOTO_BREAK_FALLBACK_ALT;
  const photoBreakCaption = content?.photoBreakCaption;

  return (
    <main className="flex flex-col">
      <ConciergeHero content={content} />

      {photoBreakUrl && (
        <section aria-hidden={!photoBreakCaption} className="bg-background">
          <ScrollReveal>
            <div className="relative h-64 w-full overflow-hidden sm:h-80 lg:h-[28rem]">
              <Image
                src={photoBreakUrl}
                alt={photoBreakAlt}
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 scrim-20" />
            </div>
          </ScrollReveal>
          {photoBreakCaption && (
            <ScrollReveal delay={0.08}>
              <p
                className={cn(
                  typography({ intent: "utility-meta" }),
                  "mx-auto max-w-2xl px-6 pb-2 pt-4 text-center",
                )}
              >
                {photoBreakCaption}
              </p>
            </ScrollReveal>
          )}
        </section>
      )}

      <ConciergeIncludes content={content} />
      <ConciergeFAQ content={content} />
      <ConciergeInquiryForm content={content} />
    </main>
  );
}
