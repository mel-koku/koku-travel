"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { usePersonDetail } from "@/hooks/usePeopleQuery";
import { usePersonAvailability } from "@/hooks/useAvailability";
import { InquiryFormC } from "./InquiryFormC";
import { AvailabilityCalendarC } from "./AvailabilityCalendarC";
import { cEase } from "@c/ui/motionC";
import type { Person } from "@/types/person";

const TYPE_LABELS: Record<string, string> = {
  artisan: "Artisan",
  guide: "Guide",
  interpreter: "Interpreter",
  author: "Author",
};

type Props = {
  person: Person | null;
  onClose: () => void;
};

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PersonDetailPanelC({ person, onClose }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const { pause, resume } = useLenis();
  const { data: detail } = usePersonDetail(person?.slug ?? null);
  const displayPerson = detail ?? person;

  const { data: availData } = usePersonAvailability(
    person?.slug ?? null,
    person ? currentMonthStr() : null
  );
  const isBookable = (availData?.availableDates?.length ?? 0) > 0;

  // Scroll lock + Lenis pause
  useEffect(() => {
    if (!person) return;
    pause();
    return () => resume();
  }, [person, pause, resume]);

  // Escape key
  useEffect(() => {
    if (!person) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [person, onClose]);

  const panelTransition = prefersReducedMotion
    ? { duration: 0.15 }
    : { duration: 0.4, ease: cEase };

  return (
    <AnimatePresence>
      {person && displayPerson && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-charcoal/30"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={panelTransition}
            className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[560px] flex-col bg-[var(--background)] border-l border-[var(--border)]"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {TYPE_LABELS[displayPerson.type] ?? displayPerson.type}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto" data-lenis-prevent>
              <div className="px-6 py-6">
                {/* Profile header */}
                <div className="flex items-start gap-5">
                  {displayPerson.photo_url ? (
                    <Image
                      src={displayPerson.photo_url}
                      alt={displayPerson.name}
                      width={96}
                      height={96}
                      className="h-24 w-24 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-2xl font-bold text-[var(--muted-foreground)]">
                      {displayPerson.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2
                      className="text-2xl font-bold text-[var(--foreground)]"
                      style={{
                        fontFamily:
                          "var(--font-plus-jakarta), system-ui, sans-serif",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {displayPerson.name}
                    </h2>
                    {displayPerson.name_japanese && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {displayPerson.name_japanese}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      {displayPerson.city && (
                        <span>
                          {displayPerson.city}
                          {displayPerson.prefecture
                            ? `, ${displayPerson.prefecture}`
                            : ""}
                        </span>
                      )}
                      {displayPerson.years_experience && (
                        <>
                          <span className="text-[var(--border)]">/</span>
                          <span>
                            {displayPerson.years_experience} years experience
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {displayPerson.bio && (
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      About
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                      {displayPerson.bio}
                    </p>
                  </div>
                )}

                {/* Specialties */}
                {displayPerson.specialties.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      Specialties
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {displayPerson.specialties.map((s) => (
                        <span
                          key={s}
                          className="border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {displayPerson.languages.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      Languages
                    </p>
                    <p className="mt-2 text-sm text-[var(--foreground)]">
                      {displayPerson.languages.join(", ")}
                    </p>
                  </div>
                )}

                {/* Experiences */}
                {detail?.experiences && detail.experiences.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      {displayPerson.type === "interpreter"
                        ? "Available to interpret at"
                        : "Experiences"}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {detail.experiences.map((exp) => (
                        <li
                          key={exp.slug}
                          className="text-sm text-[var(--foreground)]"
                        >
                          <a
                            href={`/c/guides/${exp.slug}`}
                            className="capitalize transition-colors hover:text-[var(--primary)]"
                          >
                            {exp.slug.replace(/-/g, " ")}
                          </a>
                          {exp.is_primary &&
                            displayPerson.type !== "interpreter" && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--primary)]">
                                Primary
                              </span>
                            )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Website */}
                {displayPerson.website_url && (
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      Website
                    </p>
                    <a
                      href={displayPerson.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-[var(--primary)] hover:underline"
                    >
                      {displayPerson.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}

                {/* Booking / Inquiry */}
                <div className="mt-8">
                  {isBookable ? (
                    <AvailabilityCalendarC person={displayPerson} />
                  ) : (
                    <InquiryFormC person={displayPerson} />
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
