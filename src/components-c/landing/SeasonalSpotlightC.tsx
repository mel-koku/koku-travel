"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { resizePhotoUrl } from "@/lib/google/transformations";
import type { Season } from "@/lib/utils/seasonUtils";
import type { GuideSummary } from "@/types/guide";
import type { ExperienceSummary } from "@/types/experience";
import type { Location } from "@/types/location";
import type { LandingPageContent } from "@/types/sanitySiteContent";

type SeasonalSpotlightCProps = {
  season: Season;
  guides: GuideSummary[];
  experiences: ExperienceSummary[];
  locations: Location[];
  content?: LandingPageContent;
};

const cEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: cEase },
  }),
};

const SEASON_HEADINGS: Record<Season, string> = {
  spring: "Cherry blossoms and fresh starts",
  summer: "Festivals, fireworks, and cool escapes",
  fall: "Koyo colors at their peak",
  winter: "Hot springs and illuminations",
};

function getSeasonHeading(
  season: Season,
  content?: LandingPageContent,
): string {
  const key =
    `seasonalSpotlight${season.charAt(0).toUpperCase() + season.slice(1)}Heading` as keyof LandingPageContent;
  const autumnKey = "seasonalSpotlightAutumnHeading" as keyof LandingPageContent;
  const sanityValue =
    season === "fall"
      ? (content?.[autumnKey] as string | undefined)
      : (content?.[key] as string | undefined);
  return sanityValue ?? SEASON_HEADINGS[season];
}

type CardData = {
  type: "guide" | "experience" | "location";
  id: string;
  title: string;
  image: string;
  href: string;
  subtitle: string;
};

const TYPE_LABELS: Record<CardData["type"], string> = {
  guide: "Guide",
  experience: "Experience",
  location: "Place",
};

export function SeasonalSpotlightC({
  season,
  guides,
  experiences,
  locations,
  content,
}: SeasonalSpotlightCProps) {
  const prefersReducedMotion = useReducedMotion();

  const cards: CardData[] = [];
  for (const guide of guides) {
    if (cards.length >= 6) break;
    cards.push({
      type: "guide",
      id: guide.id,
      title: guide.title,
      image: guide.thumbnailImage || guide.featuredImage,
      href: `/c/guides/${guide.id}`,
      subtitle: guide.city || guide.region || "Japan",
    });
  }
  for (const exp of experiences) {
    if (cards.length >= 6) break;
    cards.push({
      type: "experience",
      id: exp._id ?? exp.slug,
      title: exp.title,
      image: exp.thumbnailImage?.url || exp.featuredImage?.url || "",
      href: `/c/experiences/${exp.slug}`,
      subtitle: exp.city || exp.region || "Japan",
    });
  }
  for (const loc of locations) {
    if (cards.length >= 6) break;
    cards.push({
      type: "location",
      id: loc.id,
      title: loc.name,
      image: loc.primaryPhotoUrl || loc.image || "",
      href: `/c/places?location=${loc.id}`,
      subtitle: loc.city,
    });
  }

  if (cards.length === 0) return null;

  return (
    <section
      aria-label="Seasonal spotlight"
      className="bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="py-24 sm:py-32 lg:py-48">
          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                {content?.seasonalSpotlightEyebrow ?? "What's in season"}
              </p>
              <h2
                className="mt-4 leading-[1.1]"
                style={{
                  fontFamily:
                    "var(--font-plus-jakarta), system-ui, sans-serif",
                  fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {getSeasonHeading(season, content)}
              </h2>
            </div>
            <Link
              href="/c/places?sort=in_season"
              className="hidden text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--primary)] transition-opacity hover:opacity-70 sm:block"
            >
              All Seasonal
            </Link>
          </div>

          {/* Grid */}
          <div className="mt-12 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {cards.map((card, i) => {
              const imageSrc = resizePhotoUrl(card.image, 600);
              return (
                <motion.div
                  key={card.id}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i}
                  className={`group bg-[var(--background)] ${i >= 2 ? "hidden sm:block" : ""}`}
                >
                  <Link href={card.href} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {imageSrc ? (
                        <Image
                          src={imageSrc}
                          alt={card.title}
                          fill
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[var(--surface)]" />
                      )}
                      {/* Type badge */}
                      <span className="absolute left-3 top-3 z-10 bg-[var(--primary)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                        {TYPE_LABELS[card.type]}
                      </span>
                    </div>
                    <div className="p-5 lg:p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                        {card.subtitle}
                      </p>
                      <h3
                        className="mt-2 text-base font-bold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)] lg:text-lg"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {card.title}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-b border-[var(--border)]" />
    </section>
  );
}
