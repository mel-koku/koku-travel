"use client";

import { useState, useMemo } from "react";
import { usePersonAvailability, useExperienceInterpreters } from "@/hooks/useAvailability";
import { usePersonBookedSlots, useCreateBooking, useBookingPrice } from "@/hooks/useBooking";
import { useAuthState } from "@/components/ui/IdentityBadge";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { Person, BookingSession } from "@/types/person";

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

function formatPrice(amount: number, currency = "JPY"): string {
  return `${currency === "JPY" ? "¥" : currency + " "}${amount.toLocaleString()}`;
}

export function AvailabilityCalendar({ person, experienceSlug }: Props) {
  const today = todayStr();
  const todayDate = parseLocalDate(today)!;
  const { isSignedIn } = useAuthState();

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<BookingSession | null>(null);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState(1);
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const monthStr = toMonthStr(viewYear, viewMonth);
  const { data: availData, isLoading } = usePersonAvailability(person.slug, monthStr);
  const { data: bookedData } = usePersonBookedSlots(person.slug, monthStr);
  const { data: interpData, isLoading: interpLoading } = useExperienceInterpreters(
    experienceSlug ?? null,
    selectedDate
  );
  const { data: priceData } = useBookingPrice(
    person.id,
    groupSize,
    experienceSlug,
    selectedDate ?? undefined
  );
  const createBooking = useCreateBooking();

  const bookedSlots = useMemo(() => {
    return new Set(bookedData?.bookedSlots ?? []);
  }, [bookedData]);

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
    resetSelection();
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    resetSelection();
  }

  function resetSelection() {
    setSelectedDate(null);
    setSelectedSession(null);
    setSelectedInterpreter(null);
    setShowConfirm(false);
    setGroupSize(1);
    setNotes("");
  }

  function handleDateClick(dateStr: string) {
    if (!availableSet.has(dateStr)) return;
    if (selectedDate === dateStr) {
      resetSelection();
    } else {
      setSelectedDate(dateStr);
      setSelectedSession(null);
      setSelectedInterpreter(null);
      setShowConfirm(false);
    }
  }

  function handleBook() {
    if (!selectedDate || !selectedSession) return;
    createBooking.mutate(
      {
        personId: person.id,
        personSlug: person.slug,
        experienceSlug,
        bookingDate: selectedDate,
        session: selectedSession,
        groupSize,
        interpreterId: selectedInterpreter ?? undefined,
        notes: notes || undefined,
      },
      { onSuccess: () => resetSelection() }
    );
  }

  const selectedSlots = selectedDate ? availableSet.get(selectedDate) : null;
  const interpreters = interpData?.interpreters ?? [];
  const price = priceData?.price;

  const selectedDateLabel = selectedDate
    ? parseLocalDate(selectedDate)!.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  function isSessionBooked(dateStr: string, session: BookingSession): boolean {
    return bookedSlots.has(`${dateStr}:${session}`);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
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
          {/* Session selection */}
          <div>
            <p className="eyebrow-editorial mb-2">Pick a session</p>
            <div className="flex gap-2">
              {selectedSlots.morning && (
                <button
                  type="button"
                  onClick={() => setSelectedSession(selectedSession === "morning" ? null : "morning")}
                  disabled={isSessionBooked(selectedDate, "morning")}
                  className={[
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    isSessionBooked(selectedDate, "morning")
                      ? "cursor-not-allowed border-border bg-canvas text-stone/50 line-through"
                      : selectedSession === "morning"
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-border bg-canvas text-foreground hover:border-brand-primary/40",
                  ].join(" ")}
                >
                  Morning · 10:00–12:00
                  {isSessionBooked(selectedDate, "morning") && (
                    <span className="ml-1 text-[10px] no-underline">(booked)</span>
                  )}
                </button>
              )}
              {selectedSlots.afternoon && (
                <button
                  type="button"
                  onClick={() => setSelectedSession(selectedSession === "afternoon" ? null : "afternoon")}
                  disabled={isSessionBooked(selectedDate, "afternoon")}
                  className={[
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    isSessionBooked(selectedDate, "afternoon")
                      ? "cursor-not-allowed border-border bg-canvas text-stone/50 line-through"
                      : selectedSession === "afternoon"
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-border bg-canvas text-foreground hover:border-brand-primary/40",
                  ].join(" ")}
                >
                  Afternoon · 14:00–16:00
                  {isSessionBooked(selectedDate, "afternoon") && (
                    <span className="ml-1 text-[10px] no-underline">(booked)</span>
                  )}
                </button>
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
                  No interpreters available this day. You can still book without one.
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
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
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

          {/* Group size + notes (shown when session selected) */}
          {selectedSession && (
            <div className="space-y-3">
              <div>
                <label className="eyebrow-editorial block">Group size</label>
                <input
                  type="number"
                  min={1}
                  max={price?.maxGroup ?? 10}
                  value={groupSize}
                  onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 h-12 w-24 rounded-lg border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>

              {/* Price display */}
              {price && (
                <div className="rounded-lg bg-canvas px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-foreground-secondary">Base</span>
                    <span className="text-sm text-foreground">{formatPrice(price.basePrice, price.currency)}</span>
                  </div>
                  {price.extraGuests > 0 && price.perPersonPrice > 0 && (
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs text-foreground-secondary">
                        +{price.extraGuests} guest{price.extraGuests > 1 ? "s" : ""} × {formatPrice(price.perPersonPrice, price.currency)}
                      </span>
                      <span className="text-sm text-foreground">
                        {formatPrice(price.extraGuests * price.perPersonPrice, price.currency)}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
                    <span className="text-xs font-semibold text-foreground">Total</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(price.totalPrice, price.currency)}
                    </span>
                  </div>
                  {price.durationMinutes && (
                    <p className="mt-1 text-[10px] text-stone">
                      {price.durationMinutes} min session
                    </p>
                  )}
                </div>
              )}
              {!price && (
                <p className="text-xs text-foreground-secondary">Free</p>
              )}

              <div>
                <label className="eyebrow-editorial block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Anything ${person.name.split(" ")[0]} should know`}
                  rows={2}
                  maxLength={2000}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
            </div>
          )}

          {/* CTA */}
          {selectedSession && !showConfirm && (
            <div>
              {!isSignedIn ? (
                <div className="text-center">
                  <p className="text-sm text-foreground-secondary">Sign in to book.</p>
                  <a
                    href="/signin"
                    className="mt-2 inline-flex h-11 items-center rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
                  >
                    Sign in
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="h-11 w-full rounded-lg bg-brand-primary text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
                >
                  Book {selectedDateLabel} · {selectedSession === "morning" ? "Morning" : "Afternoon"}
                </button>
              )}
            </div>
          )}

          {/* Confirmation step */}
          {showConfirm && (
            <div className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-4">
              <p className="text-sm font-semibold text-foreground">Confirm your booking</p>
              <div className="space-y-1 text-xs text-foreground-secondary">
                <p>{person.name}, {person.type}</p>
                <p>{selectedDateLabel}, {selectedSession === "morning" ? "10:00–12:00" : "14:00–16:00"}</p>
                <p>{groupSize} guest{groupSize > 1 ? "s" : ""}</p>
                {price && <p className="font-medium text-foreground">{formatPrice(price.totalPrice, price.currency)}</p>}
                {!price && <p className="font-medium text-foreground">Free</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="h-11 flex-1 rounded-lg border border-border text-sm font-medium text-foreground-secondary hover:text-foreground"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={createBooking.isPending}
                  className="h-11 flex-1 rounded-lg bg-brand-primary text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {createBooking.isPending ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {createBooking.isSuccess && (
            <div className="rounded-lg border border-success/30 bg-success/10 p-5 text-center">
              <svg
                className="mx-auto h-8 w-8 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-foreground">Booking confirmed</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                Check your email for details. View all bookings on your dashboard.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
