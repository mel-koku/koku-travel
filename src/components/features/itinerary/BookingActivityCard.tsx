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

export function BookingActivityCard({ booking }: Props) {
  return (
    <div className="rounded-lg border border-success/30 bg-success/5 p-4">
      <div className="flex items-start gap-3">
        {/* Booking icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-success">
              Booking
            </span>
            <span className="font-mono text-[10px] text-stone">
              {booking.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {booking.person.name}
          </p>
          <p className="text-xs text-foreground-secondary">
            {booking.person.type} · {booking.session === "morning" ? "Morning" : "Afternoon"} {sessionLabel(booking.session)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-stone">
            <span>{booking.group_size} guest{booking.group_size > 1 ? "s" : ""}</span>
            <span>{formatPrice(booking.total_price, booking.currency)}</span>
          </div>
          {booking.interpreter && (
            <p className="mt-1 text-xs text-foreground-secondary">
              + Interpreter: {booking.interpreter.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
