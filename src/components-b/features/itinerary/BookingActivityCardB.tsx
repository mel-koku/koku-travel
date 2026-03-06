"use client";

import type { BookingWithPerson } from "@/types/person";

function sessionLabel(session: string): string {
  return session === "morning" ? "10:00\u201312:00" : "14:00\u201316:00";
}

function formatPrice(amount: number | null, currency = "JPY"): string {
  if (!amount) return "Free";
  return `${currency === "JPY" ? "\u00a5" : currency + " "}${amount.toLocaleString()}`;
}

type Props = {
  booking: BookingWithPerson;
};

export function BookingActivityCardB({ booking }: Props) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "color-mix(in srgb, var(--success) 5%, transparent)",
        border: "1px solid color-mix(in srgb, var(--success) 25%, transparent)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Booking icon */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--success) 12%, transparent)",
            color: "var(--success)",
          }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: "var(--success)" }}
            >
              Booking
            </span>
            <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
              {booking.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
            {booking.person.name}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {booking.person.type} · {booking.session === "morning" ? "Morning" : "Afternoon"} {sessionLabel(booking.session)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span>{booking.group_size} guest{booking.group_size > 1 ? "s" : ""}</span>
            <span className="font-semibold text-[var(--foreground)]">{formatPrice(booking.total_price, booking.currency)}</span>
          </div>
          {booking.interpreter && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              + Interpreter: {booking.interpreter.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
