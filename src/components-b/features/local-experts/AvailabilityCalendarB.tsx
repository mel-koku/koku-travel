"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePersonAvailability, useExperienceInterpreters } from "@/hooks/useAvailability";
import { InquiryFormB } from "./InquiryFormB";
import type { Person } from "@/types/person";

const bEase = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = {
  person: Person;
  experienceSlug?: string;
};

function toMonthStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AvailabilityCalendarB({ person, experienceSlug }: Props) {
  const today = todayStr();
  const todayDate = new Date(today + "T00:00:00");

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [showInquiry, setShowInquiry] = useState(false);

  const monthStr = toMonthStr(viewYear, viewMonth);
  const { data: availData, isLoading } = usePersonAvailability(person.slug, monthStr);
  const { data: interpData, isLoading: interpLoading } = useExperienceInterpreters(
    experienceSlug ?? null,
    selectedDate
  );

  const availableSet = useMemo(() => {
    const map = new Map<string, { morning: boolean; afternoon: boolean }>();
    for (const d of availData?.availableDates ?? []) {
      map.set(d.date, { morning: d.morning, afternoon: d.afternoon });
    }
    return map;
  }, [availData]);

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null); setSelectedInterpreter(null); setShowInquiry(false);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null); setSelectedInterpreter(null); setShowInquiry(false);
  }

  function handleDateClick(dateStr: string) {
    if (!availableSet.has(dateStr)) return;
    if (selectedDate === dateStr) {
      setSelectedDate(null); setSelectedInterpreter(null); setShowInquiry(false);
    } else {
      setSelectedDate(dateStr); setSelectedInterpreter(null); setShowInquiry(false);
    }
  }

  const selectedSlots = selectedDate ? availableSet.get(selectedDate) : null;
  const interpreters = interpData?.interpreters ?? [];
  const selectedInterpreterPerson = interpreters.find(i => i.id === selectedInterpreter);

  const inquiryPerson: Person | null = selectedInterpreter && selectedInterpreterPerson
    ? {
        id: selectedInterpreterPerson.id,
        name: selectedInterpreterPerson.name,
        type: "interpreter",
        slug: "",
        languages: selectedInterpreterPerson.languages,
        specialties: [],
        is_published: true,
        city: selectedInterpreterPerson.city ?? undefined,
        created_at: "",
        updated_at: "",
      }
    : null;

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
          Check availability
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            aria-label="Previous month"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="w-28 text-center text-sm font-semibold text-[var(--foreground)]">
            {MONTHS[viewMonth - 1]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            aria-label="Next month"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="mt-4 grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[var(--surface)]" />
          ))}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isAvailable = availableSet.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === today;
            const isPast = dateStr < today;

            return (
              <motion.button
                key={dateStr}
                type="button"
                disabled={!isAvailable || isPast}
                onClick={() => handleDateClick(dateStr)}
                whileHover={isAvailable && !isPast ? { scale: 1.15 } : {}}
                whileTap={isAvailable && !isPast ? { scale: 0.95 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={[
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm",
                  isSelected
                    ? "bg-[var(--primary)] font-semibold text-white"
                    : isAvailable && !isPast
                    ? "text-[var(--foreground)] hover:bg-[var(--surface)]"
                    : "cursor-default text-[var(--muted-foreground)] opacity-30",
                  isToday && !isSelected
                    ? "ring-1 ring-[var(--primary)] ring-offset-1"
                    : "",
                ].join(" ")}
              >
                {isAvailable && !isPast && !isSelected && (
                  <span className="relative">
                    {day}
                    <span
                      className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: "var(--primary)" }}
                    />
                  </span>
                )}
                {(!isAvailable || isPast || isSelected) && day}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full ring-1" style={{ "--tw-ring-color": "var(--primary)" } as React.CSSProperties} />
          Today
        </span>
      </div>

      {/* Expanded date panel */}
      <AnimatePresence>
        {selectedDate && selectedSlots && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: bEase }}
            className="mt-5 space-y-4 border-t border-[var(--border)] pt-5"
          >
            {/* Session times */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Session times
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.morning && (
                  <span className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    Morning · 10:00–12:00
                  </span>
                )}
                {selectedSlots.afternoon && (
                  <span className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    Afternoon · 14:00–16:00
                  </span>
                )}
              </div>
            </div>

            {/* Interpreters */}
            {experienceSlug && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  Interpreters available
                  {interpLoading && <span className="ml-1 opacity-60">(loading…)</span>}
                </p>
                {!interpLoading && interpreters.length === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    No interpreters available this day — you can still book without one.
                  </p>
                )}
                {interpreters.length > 0 && (
                  <div className="space-y-2">
                    {interpreters.map((interp) => (
                      <motion.button
                        key={interp.id}
                        type="button"
                        onClick={() => setSelectedInterpreter(
                          selectedInterpreter === interp.id ? null : interp.id
                        )}
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={[
                          "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                          selectedInterpreter === interp.id
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-[var(--border)] hover:border-[var(--primary)]/40",
                        ].join(" ")}
                        style={
                          selectedInterpreter === interp.id
                            ? { backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }
                            : {}
                        }
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ backgroundColor: "var(--surface)", color: "var(--muted-foreground)" }}
                        >
                          {interp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{interp.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{interp.languages.join(", ")}</p>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                          {interp.morning && interp.afternoon ? "All day" : interp.morning ? "AM" : "PM"}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            {!showInquiry ? (
              <motion.button
                type="button"
                onClick={() => setShowInquiry(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="h-11 w-full rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Request {selectedDateLabel}
                {selectedInterpreterPerson ? " + interpreter" : ""}
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  {inquiryPerson
                    ? `Book with interpreter: ${inquiryPerson.name}`
                    : `Book ${person.name.split(" ")[0]}`}
                </p>
                <InquiryFormB
                  person={inquiryPerson ?? person}
                  prefilledDate={selectedDate}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
