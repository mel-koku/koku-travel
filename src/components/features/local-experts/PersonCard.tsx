"use client";

import { motion } from "framer-motion";
import { easeReveal } from "@/lib/motion";
import type { Person } from "@/types/person";

const TYPE_LABELS: Record<string, string> = {
  artisan: "Artisan",
  guide: "Guide",
  host: "Host",
  interpreter: "Interpreter",
};

type Props = {
  person: Person;
  index: number;
  onClick: () => void;
};

export function PersonCard({ person, index, onClick }: Props) {
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      className="group flex w-full flex-col items-center rounded-xl bg-surface p-6 text-center transition-transform hover:-translate-y-1"
    >
      {/* Photo / Avatar */}
      {person.photo_url ? (
        <img
          src={person.photo_url}
          alt={person.name}
          className="h-20 w-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-canvas text-lg font-bold text-foreground-secondary">
          {initials}
        </div>
      )}

      {/* Type badge */}
      <span className="eyebrow-mono mt-3 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-brand-primary">
        {TYPE_LABELS[person.type] ?? person.type}
      </span>

      {/* Name */}
      <h3 className="mt-2 text-base font-semibold text-foreground transition-colors group-hover:text-brand-primary">
        {person.name}
      </h3>
      {person.name_japanese && (
        <p className="text-xs text-foreground-secondary">
          {person.name_japanese}
        </p>
      )}

      {/* City */}
      {person.city && (
        <p className="mt-1 text-sm text-foreground-secondary">
          {person.city}
          {person.prefecture ? `, ${person.prefecture}` : ""}
        </p>
      )}

      {/* Bio excerpt */}
      {person.bio && (
        <p className="mt-2 line-clamp-2 text-sm text-foreground-body">
          {person.bio}
        </p>
      )}

      {/* Specialties */}
      {person.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {person.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-lg bg-canvas px-2 py-0.5 text-xs text-foreground-secondary"
            >
              {s}
            </span>
          ))}
          {person.specialties.length > 3 && (
            <span className="text-xs text-stone">
              +{person.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Languages */}
      {person.languages.length > 0 && (
        <p className="mt-2 text-xs text-stone">
          {person.languages.join(" · ")}
        </p>
      )}
    </motion.button>
  );
}
