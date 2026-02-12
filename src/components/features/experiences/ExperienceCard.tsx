"use client";

import Image from "next/image";
import Link from "next/link";
import { useCursor } from "@/providers/CursorProvider";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { easeCinematicCSS } from "@/lib/motion";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";

const EXPERIENCE_TYPE_LABELS: Record<ExperienceType, string> = {
  workshop: "Workshop",
  cruise: "Cruise",
  tour: "Tour",
  experience: "Experience",
  adventure: "Adventure",
  rental: "Rental",
};

type ExperienceCardProps = {
  experience: ExperienceSummary;
  index: number;
};

export function ExperienceCard({ experience, index }: ExperienceCardProps) {
  const { setCursorState, isEnabled } = useCursor();
  const imageUrl = experience.thumbnailImage?.url || experience.featuredImage?.url || "";

  const metaParts = [
    EXPERIENCE_TYPE_LABELS[experience.experienceType],
    experience.city,
    experience.duration,
  ].filter(Boolean);

  return (
    <ScrollReveal delay={index * 0.08} distance={30}>
      <Link
        href={`/experiences/${experience.slug}`}
        className="group block"
        onMouseEnter={() => isEnabled && setCursorState("read")}
        onMouseLeave={() => isEnabled && setCursorState("default")}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={experience.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={{ transitionTimingFunction: easeCinematicCSS }}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface">
              <span className="text-stone">No image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        {/* Meta line */}
        <p className="mt-4 font-mono text-[10px] uppercase tracking-ultra text-stone">
          {metaParts.join(" \u00b7 ")}
        </p>

        {/* Title */}
        <h3 className="mt-1.5 font-serif text-lg italic text-foreground transition-colors group-hover:text-brand-primary sm:text-xl">
          {experience.title}
        </h3>

        {/* Summary */}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground-secondary">
          {experience.summary}
        </p>

        {/* Cost badge */}
        {experience.estimatedCost && (
          <p className="mt-3 inline-flex items-center rounded-xl border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-stone">
            {experience.estimatedCost}
          </p>
        )}
      </Link>
    </ScrollReveal>
  );
}
