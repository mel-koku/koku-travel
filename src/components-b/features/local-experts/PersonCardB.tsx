"use client";

import { motion } from "framer-motion";
import type { Person } from "@/types/person";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const TYPE_LABELS: Record<string, string> = {
  artisan: "Artisan",
  guide: "Guide",
  interpreter: "Interpreter",
};

type Props = {
  person: Person;
  index: number;
  onClick: () => void;
};

export function PersonCardB({ person, index, onClick }: Props) {
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: (index % 4) * 0.04,
        ease: bEase,
      }}
      onClick={onClick}
      className="group flex w-full flex-col items-center rounded-2xl bg-white p-6 text-center shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
    >
      {/* Photo / Avatar */}
      {person.photo_url ? (
        <img
          src={person.photo_url}
          alt={person.name}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface)] text-lg font-bold text-[var(--muted-foreground)]">
          {initials}
        </div>
      )}

      {/* Type badge */}
      <span className="mt-3 inline-block rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
        {TYPE_LABELS[person.type] ?? person.type}
      </span>

      {/* Name */}
      <h3 className="mt-2 text-base font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">
        {person.name}
      </h3>
      {person.name_japanese && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {person.name_japanese}
        </p>
      )}

      {/* City */}
      {person.city && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {person.city}
          {person.prefecture ? `, ${person.prefecture}` : ""}
        </p>
      )}

      {/* Bio excerpt */}
      {person.bio && (
        <p className="mt-2 line-clamp-2 text-sm text-[var(--foreground-body)]">
          {person.bio}
        </p>
      )}

      {/* Specialties */}
      {person.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {person.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-lg bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]"
            >
              {s}
            </span>
          ))}
          {person.specialties.length > 3 && (
            <span className="text-xs text-[var(--muted-foreground)]">
              +{person.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Languages */}
      {person.languages.length > 0 && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          {person.languages.join(" · ")}
        </p>
      )}
    </motion.button>
  );
}
