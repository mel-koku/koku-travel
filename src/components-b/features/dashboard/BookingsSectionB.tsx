"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useUserBookings, useCancelBooking } from "@/hooks/useBooking";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { BookingWithPerson } from "@/types/person";
import { bEase } from "@/lib/variant-b-motion";


function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr)!;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatPrice(amount: number | null, currency = "JPY"): string {
  if (!amount) return "Free";
  return `${currency === "JPY" ? "\u00a5" : currency + " "}${amount.toLocaleString()}`;
}

function sessionLabel(session: string): string {
  return session === "morning" ? "10:00\u201312:00" : "14:00\u201316:00";
}

function BookingCardB({ booking, onCancel, isCancelling }: {
  booking: BookingWithPerson;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isPast = booking.booking_date < new Date().toISOString().slice(0, 10);
  const isCancelled = booking.status === "cancelled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4, ease: bEase }}
      className={[
        "rounded-2xl bg-white p-4",
        isCancelled ? "opacity-50" : "",
      ].join(" ")}
      style={{ boxShadow: isCancelled ? "none" : "var(--shadow-card)" }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: "var(--surface)", color: "var(--muted-foreground)" }}
        >
          {booking.person.photo_url ? (
            <img
              src={booking.person.photo_url}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            booking.person.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-[var(--foreground)]">{booking.person.name}</p>
            <span
              className="rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor:
                  booking.status === "confirmed" ? "color-mix(in srgb, var(--success) 10%, transparent)"
                    : booking.status === "completed" ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : booking.status === "cancelled" ? "color-mix(in srgb, var(--error) 10%, transparent)"
                    : "var(--surface)",
                color:
                  booking.status === "confirmed" ? "var(--success)"
                    : booking.status === "completed" ? "var(--primary)"
                    : booking.status === "cancelled" ? "var(--error)"
                    : "var(--muted-foreground)",
              }}
            >
              {booking.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {booking.person.type} {booking.person.city ? `\u00b7 ${booking.person.city}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
            <span>{formatDate(booking.booking_date)}</span>
            <span>{booking.session === "morning" ? "Morning" : "Afternoon"} {sessionLabel(booking.session)}</span>
            <span>{booking.group_size} guest{booking.group_size > 1 ? "s" : ""}</span>
            <span className="font-semibold text-[var(--foreground)]">{formatPrice(booking.total_price, booking.currency)}</span>
          </div>
          {booking.interpreter && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              + Interpreter: {booking.interpreter.name}
            </p>
          )}
          {booking.notes && (
            <p className="mt-1 text-xs italic text-[var(--muted-foreground)]">&ldquo;{booking.notes}&rdquo;</p>
          )}
        </div>

        {/* Ref badge */}
        <span className="shrink-0 font-mono text-[10px] text-[var(--muted-foreground)]">
          {booking.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Cancel action */}
      {booking.status === "confirmed" && !isPast && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          {!showCancelConfirm ? (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--error)" }}
            >
              Cancel booking
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--muted-foreground)]">Cancel this booking?</p>
              <button
                type="button"
                onClick={() => onCancel(booking.id)}
                disabled={isCancelling}
                className="rounded-lg px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--error)" }}
              >
                {isCancelling ? "Cancelling\u2026" : "Yes, cancel"}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Keep it
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function BookingsSectionB() {
  const [showPast, setShowPast] = useState(false);
  const { data: upcomingData, isLoading: loadingUpcoming } = useUserBookings({ upcoming: true });
  const { data: pastData } = useUserBookings({ status: "completed" });
  const cancelBooking = useCancelBooking();

  const upcoming = upcomingData?.bookings ?? [];
  const past = pastData?.bookings ?? [];
  const hasPast = past.length > 0;

  if (loadingUpcoming) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--surface)]" />
        ))}
      </div>
    );
  }

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed p-8 text-center"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-sm text-[var(--muted-foreground)]">No bookings yet.</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Browse{" "}
          <Link href="/b/local-experts" className="font-medium hover:underline" style={{ color: "var(--primary)" }}>
            local experts
          </Link>{" "}
          to find artisans, guides, and interpreters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.map(booking => (
        <BookingCardB
          key={booking.id}
          booking={booking}
          onCancel={(id) => cancelBooking.mutate({ bookingId: id })}
          isCancelling={cancelBooking.isPending}
        />
      ))}

      {hasPast && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {showPast ? "Hide" : "Show"} past bookings ({past.length})
          </button>
          {showPast && (
            <div className="mt-3 space-y-3 opacity-60">
              {past.map(booking => (
                <BookingCardB
                  key={booking.id}
                  booking={booking}
                  onCancel={() => {}}
                  isCancelling={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
