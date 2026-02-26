"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { Season } from "@/lib/utils/seasonUtils";
import type { GuideSummary } from "@/types/guide";
import type { ExperienceSummary } from "@/types/experience";
import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type SeasonalSpotlightProps = {
  season: Season;
  guides: GuideSummary[];
  experiences: ExperienceSummary[];
  locations: Location[];
  content?: LandingPageContent;
};

const SEASON_HEADINGS: Record<Season, string> = {
  spring: "Cherry blossoms and fresh starts",
  summer: "Festivals, fireworks, and cool escapes",
  fall: "Koyo colors at their peak",
  winter: "Hot springs and illuminations",
};

function getSeasonHeading(season: Season, content?: LandingPageContent): string {
  const key = `seasonalSpotlight${season.charAt(0).toUpperCase() + season.slice(1)}Heading` as keyof LandingPageContent;
  // "fall" maps to "Autumn" in Sanity field names
  const autumnKey = "seasonalSpotlightAutumnHeading" as keyof LandingPageContent;
  const sanityValue = season === "fall"
    ? (content?.[autumnKey] as string | undefined)
    : (content?.[key] as string | undefined);
  return sanityValue ?? SEASON_HEADINGS[season];
}

export function SeasonalSpotlight({
  season,
  guides,
  experiences,
  locations,
  content,
}: SeasonalSpotlightProps) {
  const totalItems = guides.length + experiences.length + locations.length;
  if (totalItems === 0) return null;

  // Build mixed cards — fill up to 6 slots
  const cards: CardData[] = [];
  for (const guide of guides) {
    if (cards.length >= 6) break;
    cards.push({ type: "guide", id: guide.id, title: guide.title, image: guide.thumbnailImage || guide.featuredImage, href: `/guides/${guide.id}`, subtitle: guide.city || guide.region || "Japan", summary: guide.summary });
  }
  for (const exp of experiences) {
    if (cards.length >= 6) break;
    cards.push({ type: "experience", id: exp._id ?? exp.slug, title: exp.title, image: exp.thumbnailImage?.url || exp.featuredImage?.url || "", href: `/experiences/${exp.slug}`, subtitle: exp.city || exp.region || "Japan", summary: exp.summary });
  }
  for (const loc of locations) {
    if (cards.length >= 6) break;
    cards.push({ type: "location", id: loc.id, title: loc.name, image: loc.primaryPhotoUrl || loc.image || "", href: `/places?location=${loc.id}`, subtitle: loc.city, summary: loc.shortDescription || "" });
  }

  if (cards.length === 0) return null;

  const heading = getSeasonHeading(season, content);

  return (
    <section className="bg-background py-12 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <ScrollReveal direction="up" distance={20} duration={0.6}>
          <div className="mb-10 flex flex-col gap-6 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow-editorial text-brand-secondary">
                {content?.seasonalSpotlightEyebrow ?? "What's in season"}
              </p>
              <h2 className="mt-4 font-serif italic text-3xl tracking-heading text-foreground sm:text-4xl">
                {heading}
              </h2>
              <p className="mt-4 max-w-md text-base text-foreground-secondary">
                {content?.seasonalSpotlightDescription ?? "Places, guides, and experiences at their best right now."}
              </p>
            </div>
            <Link
              href="/places?sort=in_season"
              className="link-reveal group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:text-brand-secondary"
            >
              {content?.seasonalSpotlightCtaText ?? "See all seasonal picks"}
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, idx) => (
            <ScrollReveal
              key={card.id}
              direction="up"
              distance={20}
              duration={0.6}
              delay={idx * 0.08}
            >
              <SpotlightCard card={card} idx={idx} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Internal types + sub-component ───────────────────────────

type CardData = {
  type: "guide" | "experience" | "location";
  id: string;
  title: string;
  image: string;
  href: string;
  subtitle: string;
  summary: string;
};

const TYPE_LABELS: Record<CardData["type"], string> = {
  guide: "Guide",
  experience: "Experience",
  location: "Place",
};

function SpotlightCard({ card, idx }: { card: CardData; idx: number }) {
  const imageSrc = resizePhotoUrl(card.image, 600);

  return (
    <Link
      href={card.href}
      className={`group relative block text-foreground ${idx >= 2 ? "hidden sm:block" : ""}`}
    >
      <div className="relative w-full overflow-hidden rounded-xl aspect-[4/3]">
        <Image
          src={imageSrc || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="}
          alt={card.title}
          fill
          className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center rounded-xl bg-brand-secondary/90 px-2 py-0.5 text-[10px] font-medium text-charcoal shadow-sm">
            {TYPE_LABELS[card.type]}
          </span>
        </div>

        {/* Bottom accent line on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-secondary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

        {/* Text overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-0.5 font-mono">
            {card.subtitle}
          </p>
          <p className="font-serif italic text-white text-base line-clamp-1 group-hover:text-brand-primary transition-colors">
            {card.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
