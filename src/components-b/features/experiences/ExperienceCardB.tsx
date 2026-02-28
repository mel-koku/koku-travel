"use client";

import Image from "next/image";
import Link from "next/link";
import type { ExperienceSummary, ExperienceType } from "@/types/experience";

const EXPERIENCE_TYPE_LABELS: Record<ExperienceType, string> = {
  workshop: "Workshop",
  cruise: "Cruise",
  tour: "Tour",
  experience: "Experience",
  adventure: "Adventure",
  rental: "Rental",
};

type ExperienceCardBProps = {
  experience: ExperienceSummary;
  index: number;
  eager?: boolean;
};

export function ExperienceCardB({ experience, eager = false }: ExperienceCardBProps) {
  const imageUrl = experience.thumbnailImage?.url || experience.featuredImage?.url || "";

  const metaParts = [
    EXPERIENCE_TYPE_LABELS[experience.experienceType],
    experience.city,
    experience.duration,
  ].filter(Boolean);

  return (
    <article className="group animate-card-in">
      <Link
        href={`/b/experiences/${experience.slug}`}
        className="block w-full overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={experience.title}
              fill
              priority={eager}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--surface)]">
              <span className="text-[var(--muted-foreground)]">No image</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            {metaParts.join(" · ")}
          </p>

          <h3 className="text-sm font-semibold text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
            {experience.title}
          </h3>

          <p className="text-xs text-[var(--foreground-body)] line-clamp-2 leading-relaxed">
            {experience.summary}
          </p>

          {experience.estimatedCost && (
            <p className="inline-flex items-center rounded-lg bg-[var(--surface)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
              {experience.estimatedCost}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
