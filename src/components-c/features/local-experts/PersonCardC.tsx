"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useBookingPrice } from "@/hooks/useBooking";
import { cEase } from "@c/ui/motionC";
import type { Person } from "@/types/person";

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

export function PersonCardC({ person, index, onClick }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const { data: priceData } = useBookingPrice(person.id, 1);
  const startingPrice = priceData?.price;

  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.button
      type="button"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: (index % 3) * 0.06,
        ease: cEase,
      }}
      onClick={onClick}
      className="group flex w-full flex-col bg-[var(--background)] p-6 text-left transition-colors border border-[var(--border)]"
    >
      {/* Top row: avatar + type */}
      <div className="flex items-center gap-4">
        {person.photo_url ? (
          <Image
            src={person.photo_url}
            alt={person.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-bold text-[var(--muted-foreground)]">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {TYPE_LABELS[person.type] ?? person.type}
          </span>
          <h3
            className="mt-0.5 text-base font-bold text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--primary)]"
            style={{
              fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
              letterSpacing: "-0.03em",
            }}
          >
            {person.name}
          </h3>
          {person.name_japanese && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {person.name_japanese}
            </p>
          )}
        </div>
      </div>

      {/* City */}
      {person.city && (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {person.city}
          {person.prefecture ? `, ${person.prefecture}` : ""}
        </p>
      )}

      {/* Bio excerpt */}
      {person.bio && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {person.bio}
        </p>
      )}

      {/* Specialties */}
      {person.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {person.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]"
            >
              {s}
            </span>
          ))}
          {person.specialties.length > 3 && (
            <span className="px-1 text-[11px] text-[var(--muted-foreground)]">
              +{person.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Languages */}
      {person.languages.length > 0 && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          {person.languages.join(" / ")}
        </p>
      )}

      {/* Price badge */}
      {startingPrice && (
        <span className="mt-3 inline-flex self-start border border-[var(--primary)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
          From {"\u00a5"}{startingPrice.basePrice.toLocaleString()}
        </span>
      )}
    </motion.button>
  );
}
