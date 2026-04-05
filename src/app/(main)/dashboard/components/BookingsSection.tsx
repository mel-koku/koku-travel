"use client";

import { useState } from "react";
import Link from "next/link";
import { useUserBookings, useCancelBooking } from "@/hooks/useBooking";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type { BookingWithPerson } from "@/types/person";

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

function BookingCard({ booking, onCancel, isCancelling }: {
  booking: BookingWithPerson;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isPast = booking.booking_date < new Date().toISOString().slice(0, 10);
  const isCancelled = booking.status === "cancelled";

  return (
    <div className={[
      "rounded-lg border p-4 transition-colors",
      isCancelled ? "border-border/50 bg-canvas/50 opacity-60" : "border-border bg-canvas",
    ].join(" ")}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-foreground-secondary">
          {booking.person.photo_url ? (
            // 44x44 avatar, external URL. next/image overhead isn't worth it here.
            // eslint-disable-next-line @next/next/no-img-element
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
            <p className="text-sm font-semibold text-foreground">{booking.person.name}</p>
            <span className={[
              "rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              booking.status === "confirmed" ? "bg-success/10 text-success"
                : booking.status === "completed" ? "bg-brand-secondary/10 text-brand-secondary"
                : booking.status === "cancelled" ? "bg-error/10 text-error"
                : "bg-canvas text-stone",
            ].join(" ")}>
              {booking.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-foreground-secondary">
            {booking.person.type} {booking.person.city ? `\u00b7 ${booking.person.city}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-secondary">
            <span>{formatDate(booking.booking_date)}</span>
            <span>{booking.session === "morning" ? "Morning" : "Afternoon"} {sessionLabel(booking.session)}</span>
            <span>{booking.group_size} guest{booking.group_size > 1 ? "s" : ""}</span>
            <span className="font-medium text-foreground">{formatPrice(booking.total_price, booking.currency)}</span>
          </div>
          {booking.interpreter && (
            <p className="mt-1 text-xs text-foreground-secondary">
              + Interpreter: {booking.interpreter.name}
            </p>
          )}
          {booking.notes && (
            <p className="mt-1 text-xs text-stone italic">&ldquo;{booking.notes}&rdquo;</p>
          )}
        </div>

        {/* Ref badge */}
        <span className="shrink-0 font-mono text-[10px] text-stone">
          {booking.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Cancel action */}
      {booking.status === "confirmed" && !isPast && (
        <div className="mt-3 border-t border-border pt-3">
          {!showCancelConfirm ? (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs font-medium text-error hover:underline"
            >
              Cancel booking
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs text-foreground-secondary">Cancel this booking?</p>
              <button
                type="button"
                onClick={() => onCancel(booking.id)}
                disabled={isCancelling}
                className="rounded-lg bg-error px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {isCancelling ? "Cancelling\u2026" : "Yes, cancel"}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="text-xs text-foreground-secondary hover:text-foreground"
              >
                Keep it
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BookingsSection() {
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
          <div key={i} className="h-24 animate-pulse rounded-lg bg-canvas" />
        ))}
      </div>
    );
  }

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-canvas/50 p-8 text-center">
        <p className="text-sm text-foreground-secondary">No bookings yet.</p>
        <p className="mt-1 text-xs text-stone">
          Browse{" "}
          <Link href="/local-experts" className="text-brand-primary hover:underline">
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
        <ScrollReveal key={booking.id} delay={0.05} distance={15}>
          <BookingCard
            booking={booking}
            onCancel={(id) => cancelBooking.mutate({ bookingId: id })}
            isCancelling={cancelBooking.isPending}
          />
        </ScrollReveal>
      ))}

      {hasPast && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowPast(!showPast)}
            className="text-xs font-medium text-foreground-secondary hover:text-foreground"
          >
            {showPast ? "Hide" : "Show"} past bookings ({past.length})
          </button>
          {showPast && (
            <div className="mt-3 space-y-3 opacity-70">
              {past.map(booking => (
                <BookingCard
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
