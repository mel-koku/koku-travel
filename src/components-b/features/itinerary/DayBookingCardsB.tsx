"use client";

import { useItineraryBookings } from "@/hooks/useItineraryBookings";
import { BookingActivityCardB } from "./BookingActivityCardB";

type Props = {
  tripStartDate?: string;
  dayIndex: number;
  totalDays: number;
};

export function DayBookingCardsB({ tripStartDate, dayIndex, totalDays }: Props) {
  const bookingsByDay = useItineraryBookings(tripStartDate, totalDays);
  const dayBookings = bookingsByDay.get(dayIndex);

  if (!dayBookings?.length) return null;

  return (
    <div className="mb-3 space-y-2">
      {dayBookings.map((booking) => (
        <BookingActivityCardB key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
