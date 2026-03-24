"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { typography } from "@/lib/typography-system";
import { cn } from "@/lib/utils";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";
import { getCraftTypeById } from "@/data/craftTypes";

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
  /** Render immediately without scroll-triggered reveal */
  eager?: boolean;
  /** Compact mode for landing page: smaller title, no summary/badges */
  compact?: boolean;
};

export function ExperienceCard({ experience, index, eager = false, compact = false }: ExperienceCardProps) {
  const imageUrl = experience.thumbnailImage?.url || experience.featuredImage?.url || "";

  const metaParts = [
    EXPERIENCE_TYPE_LABELS[experience.experienceType],
    experience.city,
    experience.duration,
  ].filter(Boolean);

  const Wrapper = eager ? "div" : ScrollReveal;
  const wrapperProps = eager ? {} : { delay: index * 0.08, distance: 30 };

  return (
    <Wrapper {...wrapperProps}>
      <Link
        href={`/guides/${experience.slug}`}
        className="group block overflow-hidden rounded-lg border border-border bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:border-foreground/30 hover:shadow-[var(--shadow-elevated)]"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={experience.title}
              fill
              priority={eager}
              className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface">
              <span className="text-stone">No image</span>
            </div>
          )}
          <div className="absolute inset-0 scrim-40 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        <div className="p-4">
          {/* Meta line */}
          <p className={cn(typography({ intent: "utility-meta" }), compact ? "text-stone" : "uppercase tracking-ultra text-stone")}>
            {metaParts.join(" \u00b7 ")}
          </p>

          {/* Title */}
          <p className={cn(
            "mt-1.5 font-serif font-medium text-foreground transition-colors group-hover:text-brand-primary",
            compact ? "text-base" : "text-lg sm:text-xl"
          )}>
            {experience.title}
          </p>

          {/* Summary — hidden in compact mode */}
          {!compact && (
            <p className={cn(typography({ intent: "utility-meta" }), "mt-2 line-clamp-2 leading-relaxed")}>
              {experience.summary}
            </p>
          )}

          {/* Craft type badge — hidden in compact mode */}
          {!compact && experience.craftType && (() => {
            const ct = getCraftTypeById(experience.craftType as never);
            return ct ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-stone">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ct.color }} />
                {ct.label}
              </p>
            ) : null;
          })()}

          {/* Cost badge */}
          {experience.estimatedCost && (
            <p className={cn(
              "inline-flex items-center rounded-md border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-stone",
              compact ? "mt-2" : "mt-3"
            )}>
              {experience.estimatedCost}
            </p>
          )}
        </div>
      </Link>
    </Wrapper>
  );
}
