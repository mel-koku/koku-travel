import { useMemo } from "react";
import { useUserBookings } from "@/hooks/useBooking";
import type { BookingWithPerson } from "@/types/person";

/**
 * Cross-references user's confirmed bookings with itinerary days.
 * Returns a map of dayIndex → bookings that fall on that day.
 */
export function useItineraryBookings(
  tripStartDate: string | undefined,
  dayCount: number
) {
  const { data } = useUserBookings({ upcoming: true });

  const bookingsByDay = useMemo(() => {
    const map = new Map<number, BookingWithPerson[]>();
    if (!tripStartDate || !data?.bookings?.length) return map;

    // Build date→dayIndex lookup
    const dateToDay = new Map<string, number>();
    for (let i = 0; i < dayCount; i++) {
      const parts = tripStartDate.split("-").map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dateToDay.set(dateStr, i);
      }
    }

    for (const booking of data.bookings) {
      if (booking.status !== "confirmed") continue;
      const dayIndex = dateToDay.get(booking.booking_date);
      if (dayIndex !== undefined) {
        const existing = map.get(dayIndex) ?? [];
        existing.push(booking);
        map.set(dayIndex, existing);
      }
    }

    return map;
  }, [tripStartDate, dayCount, data]);

  return bookingsByDay;
}
