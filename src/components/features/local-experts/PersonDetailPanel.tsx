"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeReveal, durationFast } from "@/lib/motion";
import { useLenis } from "@/providers/LenisProvider";
import { usePersonDetail } from "@/hooks/usePeopleQuery";
import { InquiryForm } from "./InquiryForm";
import type { Person } from "@/types/person";

const TYPE_LABELS: Record<string, string> = {
  artisan: "Artisan",
  guide: "Guide",
  host: "Host",
  interpreter: "Interpreter",
  author: "Author",
};

type Props = {
  person: Person | null;
  onClose: () => void;
};

export function PersonDetailPanel({ person, onClose }: Props) {
  const { pause, resume } = useLenis();
  const { data: detail } = usePersonDetail(person?.slug ?? null);
  const displayPerson = detail ?? person;

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

  return (
    <AnimatePresence>
      {person && displayPerson && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: durationFast }}
            className="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: 0.4,
              ease: [...easeReveal] as [number, number, number, number],
            }}
            className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[480px] flex-col bg-background"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <span className="eyebrow-editorial">
                {TYPE_LABELS[displayPerson.type] ?? displayPerson.type}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground-secondary transition-colors hover:text-foreground"
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
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-6">
                {/* Profile header */}
                <div className="flex items-start gap-5">
                  {displayPerson.photo_url ? (
                    <img
                      src={displayPerson.photo_url}
                      alt={displayPerson.name}
                      className="h-24 w-24 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-canvas text-2xl font-bold text-foreground-secondary">
                      {displayPerson.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-serif text-2xl italic text-foreground">
                      {displayPerson.name}
                    </h2>
                    {displayPerson.name_japanese && (
                      <p className="text-sm text-foreground-secondary">
                        {displayPerson.name_japanese}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-foreground-secondary">
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
                          <span className="text-border">·</span>
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
                    <p className="eyebrow-editorial">About</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground-body">
                      {displayPerson.bio}
                    </p>
                  </div>
                )}

                {/* Specialties */}
                {displayPerson.specialties.length > 0 && (
                  <div className="mt-6">
                    <p className="eyebrow-editorial">Specialties</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {displayPerson.specialties.map((s) => (
                        <span
                          key={s}
                          className="rounded-xl bg-canvas px-3 py-1.5 text-sm text-foreground"
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
                    <p className="eyebrow-editorial">Languages</p>
                    <p className="mt-2 text-sm text-foreground">
                      {displayPerson.languages.join(", ")}
                    </p>
                  </div>
                )}

                {/* Experiences */}
                {detail?.experiences && detail.experiences.length > 0 && (
                  <div className="mt-6">
                    <p className="eyebrow-editorial">Experiences</p>
                    <ul className="mt-2 space-y-1.5">
                      {detail.experiences.map((exp) => (
                        <li
                          key={exp.slug}
                          className="text-sm text-foreground"
                        >
                          <a
                            href={`/guides/${exp.slug}`}
                            className="capitalize hover:text-brand-primary transition-colors"
                          >
                            {exp.slug.replace(/-/g, " ")}
                          </a>
                          {exp.is_primary && (
                            <span className="ml-1.5 text-xs text-brand-primary">
                              Primary
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Links */}
                {displayPerson.website_url && (
                  <div className="mt-6">
                    <p className="eyebrow-editorial">Website</p>
                    <a
                      href={displayPerson.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-brand-primary hover:underline"
                    >
                      {displayPerson.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}

                {/* Inquiry Form */}
                <div className="mt-8">
                  <InquiryForm person={displayPerson} />
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
