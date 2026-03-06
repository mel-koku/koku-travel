"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePersonAvailability, useExperienceInterpreters } from "@/hooks/useAvailability";
import { usePersonBookedSlots, useCreateBooking, useBookingPrice } from "@/hooks/useBooking";
import { useAuthState } from "@/components/ui/IdentityBadge";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { Person, BookingSession } from "@/types/person";

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

function formatPrice(amount: number, currency = "JPY"): string {
  return `${currency === "JPY" ? "¥" : currency + " "}${amount.toLocaleString()}`;
}

export function AvailabilityCalendarB({ person, experienceSlug }: Props) {
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
            {/* Session selection */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Pick a session
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.morning && (
                  <motion.button
                    type="button"
                    onClick={() => setSelectedSession(selectedSession === "morning" ? null : "morning")}
                    disabled={isSessionBooked(selectedDate, "morning")}
                    whileHover={!isSessionBooked(selectedDate, "morning") ? { y: -1 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                      isSessionBooked(selectedDate, "morning")
                        ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] opacity-40 line-through"
                        : selectedSession === "morning"
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/40",
                    ].join(" ")}
                    style={
                      selectedSession === "morning" && !isSessionBooked(selectedDate, "morning")
                        ? { backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }
                        : {}
                    }
                  >
                    Morning · 10:00–12:00
                    {isSessionBooked(selectedDate, "morning") && (
                      <span className="ml-1 text-[10px] no-underline">(booked)</span>
                    )}
                  </motion.button>
                )}
                {selectedSlots.afternoon && (
                  <motion.button
                    type="button"
                    onClick={() => setSelectedSession(selectedSession === "afternoon" ? null : "afternoon")}
                    disabled={isSessionBooked(selectedDate, "afternoon")}
                    whileHover={!isSessionBooked(selectedDate, "afternoon") ? { y: -1 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                      isSessionBooked(selectedDate, "afternoon")
                        ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] opacity-40 line-through"
                        : selectedSession === "afternoon"
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)]/40",
                    ].join(" ")}
                    style={
                      selectedSession === "afternoon" && !isSessionBooked(selectedDate, "afternoon")
                        ? { backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }
                        : {}
                    }
                  >
                    Afternoon · 14:00–16:00
                    {isSessionBooked(selectedDate, "afternoon") && (
                      <span className="ml-1 text-[10px] no-underline">(booked)</span>
                    )}
                  </motion.button>
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

            {/* Group size + notes (shown when session selected) */}
            {selectedSession && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: bEase }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    Group size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={price?.maxGroup ?? 10}
                    value={groupSize}
                    onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1 h-12 w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--foreground)] focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "color-mix(in srgb, var(--primary) 30%, transparent)" } as React.CSSProperties}
                  />
                </div>

                {/* Price display */}
                {price && (
                  <div className="rounded-2xl bg-[var(--surface)] px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[var(--muted-foreground)]">Base</span>
                      <span className="text-sm text-[var(--foreground)]">{formatPrice(price.basePrice, price.currency)}</span>
                    </div>
                    {price.extraGuests > 0 && price.perPersonPrice > 0 && (
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-xs text-[var(--muted-foreground)]">
                          +{price.extraGuests} guest{price.extraGuests > 1 ? "s" : ""} × {formatPrice(price.perPersonPrice, price.currency)}
                        </span>
                        <span className="text-sm text-[var(--foreground)]">
                          {formatPrice(price.extraGuests * price.perPersonPrice, price.currency)}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex items-baseline justify-between border-t border-[var(--border)] pt-2">
                      <span className="text-xs font-bold text-[var(--foreground)]">Total</span>
                      <span className="text-sm font-bold text-[var(--foreground)]">
                        {formatPrice(price.totalPrice, price.currency)}
                      </span>
                    </div>
                    {price.durationMinutes && (
                      <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                        {price.durationMinutes} min session
                      </p>
                    )}
                  </div>
                )}
                {!price && (
                  <p className="text-xs text-[var(--muted-foreground)]">Free</p>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`Anything ${person.name.split(" ")[0]} should know`}
                    rows={2}
                    maxLength={2000}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "color-mix(in srgb, var(--primary) 30%, transparent)" } as React.CSSProperties}
                  />
                </div>
              </motion.div>
            )}

            {/* CTA */}
            {selectedSession && !showConfirm && (
              <div>
                {!isSignedIn ? (
                  <div className="text-center">
                    <p className="text-sm text-[var(--muted-foreground)]">Sign in to book.</p>
                    <a
                      href="/b/signin"
                      className="mt-2 inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold text-white active:scale-[0.98]"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      Sign in
                    </a>
                  </div>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="h-11 w-full rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    Book {selectedDateLabel} · {selectedSession === "morning" ? "Morning" : "Afternoon"}
                  </motion.button>
                )}
              </div>
            )}

            {/* Confirmation step */}
            {showConfirm && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: bEase }}
                className="space-y-3 rounded-2xl p-4"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--success) 5%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
                }}
              >
                <p className="text-sm font-bold text-[var(--foreground)]">Confirm your booking</p>
                <div className="space-y-1 text-xs text-[var(--muted-foreground)]">
                  <p>{person.name} — {person.type}</p>
                  <p>{selectedDateLabel}, {selectedSession === "morning" ? "10:00–12:00" : "14:00–16:00"}</p>
                  <p>{groupSize} guest{groupSize > 1 ? "s" : ""}</p>
                  {price && <p className="font-semibold text-[var(--foreground)]">{formatPrice(price.totalPrice, price.currency)}</p>}
                  {!price && <p className="font-semibold text-[var(--foreground)]">Free</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="h-11 flex-1 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleBook}
                    disabled={createBooking.isPending}
                    whileTap={{ scale: 0.98 }}
                    className="h-11 flex-1 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {createBooking.isPending ? "Booking…" : "Confirm Booking"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {createBooking.isSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="rounded-2xl p-5 text-center"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--success) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
                }}
              >
                <svg
                  className="mx-auto h-8 w-8"
                  style={{ color: "var(--success)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-3 text-sm font-bold text-[var(--foreground)]">Booking confirmed</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Check your email for details. View all bookings on your dashboard.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
