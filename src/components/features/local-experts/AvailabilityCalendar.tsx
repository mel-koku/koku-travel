"use client";

import { useState, useMemo } from "react";
import { usePersonAvailability, useExperienceInterpreters } from "@/hooks/useAvailability";
import { InquiryForm } from "./InquiryForm";
import type { Person } from "@/types/person";

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

export function AvailabilityCalendar({ person, experienceSlug }: Props) {
  const today = todayStr();
  const todayDate = new Date(today + "T00:00:00");

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth() + 1); // 1-based
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

  // Build calendar grid
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
    setSelectedInterpreter(null);
    setShowInquiry(false);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
    setSelectedInterpreter(null);
    setShowInquiry(false);
  }

  function handleDateClick(dateStr: string) {
    if (!availableSet.has(dateStr)) return;
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setSelectedInterpreter(null);
      setShowInquiry(false);
    } else {
      setSelectedDate(dateStr);
      setSelectedInterpreter(null);
      setShowInquiry(false);
    }
  }

  const selectedSlots = selectedDate ? availableSet.get(selectedDate) : null;
  const interpreters = interpData?.interpreters ?? [];

  // Pre-fill message for inquiry
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

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="eyebrow-editorial">Check availability</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:text-foreground"
            aria-label="Previous month"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="w-28 text-center text-sm font-medium text-foreground">
            {MONTHS[viewMonth - 1]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:text-foreground"
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
          <div key={d} className="py-1 text-[10px] font-medium uppercase tracking-wide text-stone">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="mt-2 grid grid-cols-7 gap-y-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="mx-auto h-8 w-8 animate-pulse rounded-full bg-canvas" />
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
              <button
                key={dateStr}
                type="button"
                disabled={!isAvailable || isPast}
                onClick={() => handleDateClick(dateStr)}
                className={[
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                  isSelected
                    ? "bg-brand-primary font-semibold text-white"
                    : isAvailable && !isPast
                    ? "text-foreground hover:bg-brand-primary/15 hover:text-brand-primary"
                    : "cursor-default text-stone/40",
                  isToday && !isSelected
                    ? "ring-1 ring-brand-primary ring-offset-1 ring-offset-surface"
                    : "",
                ].join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-stone">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-primary/60" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full ring-1 ring-brand-primary" />
          Today
        </span>
      </div>

      {/* Expanded date panel */}
      {selectedDate && selectedSlots && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          <div>
            <p className="eyebrow-editorial mb-2">Session times</p>
            <div className="flex gap-2">
              {selectedSlots.morning && (
                <span className="rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-foreground">
                  Morning · 10:00–12:00
                </span>
              )}
              {selectedSlots.afternoon && (
                <span className="rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-foreground">
                  Afternoon · 14:00–16:00
                </span>
              )}
            </div>
          </div>

          {/* Interpreters */}
          {experienceSlug && (
            <div>
              <p className="eyebrow-editorial mb-2">
                Interpreters available
                {interpLoading && <span className="ml-1 text-stone">(loading…)</span>}
              </p>
              {!interpLoading && interpreters.length === 0 && (
                <p className="text-xs text-foreground-secondary">
                  No interpreters available this day — you can still book without one.
                </p>
              )}
              {interpreters.length > 0 && (
                <div className="space-y-2">
                  {interpreters.map((interp) => (
                    <button
                      key={interp.id}
                      type="button"
                      onClick={() => setSelectedInterpreter(
                        selectedInterpreter === interp.id ? null : interp.id
                      )}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        selectedInterpreter === interp.id
                          ? "border-brand-primary bg-brand-primary/10"
                          : "border-border bg-canvas hover:border-brand-primary/40",
                      ].join(" ")}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-foreground-secondary">
                        {interp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{interp.name}</p>
                        <p className="text-xs text-stone">{interp.languages.join(", ")}</p>
                      </div>
                      <div className="shrink-0 text-xs text-foreground-secondary">
                        {interp.morning && interp.afternoon ? "All day" : interp.morning ? "AM" : "PM"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          {!showInquiry ? (
            <button
              type="button"
              onClick={() => setShowInquiry(true)}
              className="h-11 w-full rounded-xl bg-brand-primary text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
            >
              Request {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {selectedInterpreterPerson ? ` + interpreter` : ""}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="eyebrow-editorial">
                {inquiryPerson ? `Book with interpreter: ${inquiryPerson.name}` : `Book ${person.name.split(" ")[0]}`}
              </p>
              <InquiryForm
                person={inquiryPerson ?? person}
                prefilledDate={selectedDate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
