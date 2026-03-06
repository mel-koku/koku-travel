"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { easeReveal } from "@/lib/motion";
import {
  resolvePersonCategoryId,
  getCategoryById,
} from "@/lib/activityCategories";
import { useBookingPrice } from "@/hooks/useBooking";
import type { Person } from "@/types/person";

type Props = {
  person: Person;
  index: number;
  onClick: () => void;
};

const GENERIC_SPECIALTIES = new Set([
  "local knowledge",
  "traditional crafts",
  "cultural immersion",
]);

function getPrimarySpecialty(specialties: string[]): string | null {
  return (
    specialties.find((s) => !GENERIC_SPECIALTIES.has(s.toLowerCase())) ??
    specialties[0] ??
    null
  );
}

export function PersonCard({ person, index, onClick }: Props) {
  const { data: priceData } = useBookingPrice(person.id, 1);
  const startingPrice = priceData?.price;

  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const categoryId = resolvePersonCategoryId(person.specialties);
  const category = categoryId ? getCategoryById(categoryId) : null;
  const primarySpecialty = getPrimarySpecialty(person.specialties);

  const hasPhoto = !!person.photo_url;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: (index % 4) * 0.05,
        ease: [...easeReveal] as [number, number, number, number],
      }}
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-xl bg-surface text-left transition-transform hover:-translate-y-1"
    >
      {/* Editorial header — photo if available, typography otherwise */}
      {hasPhoto ? (
        <div className="relative aspect-[3/2] w-full overflow-hidden">
          <Image
            src={person.photo_url!}
            alt={person.name}
            fill
            className="object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.04]"
            sizes="(min-width:1280px) 300px, (min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />
          {/* Category label overlay */}
          {category && (
            <div className="absolute left-3 top-3">
              <span className="eyebrow-mono rounded-full bg-charcoal/60 px-2.5 py-1 text-white/80 backdrop-blur-sm">
                {category.label}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden bg-canvas px-5 py-6 transition-colors group-hover:bg-canvas/80">
          {/* Typographic zone — activity as the visual */}
          <p className="eyebrow-mono text-stone">
            {category?.label ?? primarySpecialty ?? "Local Expert"}
          </p>
          <p className="mt-2 font-serif italic text-xl leading-tight text-foreground">
            {primarySpecialty ?? category?.label ?? "Japan specialist"}
          </p>
          {person.city && (
            <p className="mt-1 font-mono text-xs text-stone">
              {person.city}
              {person.prefecture ? `, ${person.prefecture}` : ""}
            </p>
          )}
          {/* Subtle bottom accent on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] origin-left scale-x-0 bg-brand-primary transition-transform duration-500 group-hover:scale-x-100" />
        </div>
      )}

      {/* Person info */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-bold text-foreground-secondary">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-brand-primary">
            {person.name}
          </p>
          {person.name_japanese && (
            <p className="text-xs text-foreground-secondary">
              {person.name_japanese}
            </p>
          )}
          {!hasPhoto && person.years_experience ? (
            <p className="text-xs text-stone">
              {person.years_experience} yrs experience
            </p>
          ) : null}
        </div>
      </div>

      {/* Bio excerpt */}
      {person.bio && (
        <p className="mt-2 line-clamp-2 px-4 text-xs leading-relaxed text-foreground-secondary">
          {person.bio}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 px-4 pb-4 pt-3">
        <div className="flex flex-wrap gap-1">
          {person.specialties
            .filter((s) => !GENERIC_SPECIALTIES.has(s.toLowerCase()))
            .slice(0, 2)
            .map((s) => (
              <span
                key={s}
                className="rounded-lg bg-canvas px-2 py-0.5 text-xs text-foreground-secondary"
              >
                {s}
              </span>
            ))}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {startingPrice && (
            <span className="rounded-lg bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary">
              From {"\u00a5"}{startingPrice.basePrice.toLocaleString()}
            </span>
          )}
          {person.languages.length > 0 && (
            <p className="text-xs text-stone">
              {person.languages.slice(0, 2).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
