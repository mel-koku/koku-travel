import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { parseLocalDate } from "@/lib/utils/dateUtils";
import type {
  Booking,
  BookingSession,
  BookingStatus,
  BookingWithPerson,
} from "@/types/person";

const SESSION_TIMES: Record<BookingSession, { start: string; end: string }> = {
  morning: { start: "10:00", end: "12:00" },
  afternoon: { start: "14:00", end: "16:00" },
};

/**
 * Check if a slot is available (not already booked with status=confirmed).
 */
export async function isSlotAvailable(
  personId: string,
  bookingDate: string,
  session: BookingSession
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("person_id", personId)
    .eq("booking_date", bookingDate)
    .eq("session", session)
    .eq("status", "confirmed");

  if (error) {
    logger.error("Failed to check slot availability", error);
    return false;
  }

  return (count ?? 0) === 0;
}

/**
 * Check person's availability rule for a given date + session.
 * Returns true if availability_rules allow it.
 */
export async function isPersonAvailableForSlot(
  personId: string,
  bookingDate: string,
  session: BookingSession
): Promise<boolean> {
  const supabase = await createClient();

  const dateObj = parseLocalDate(bookingDate)!;
  const dow = dateObj.getDay();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select(
      "day_of_week, specific_date, morning_available, afternoon_available, is_available"
    )
    .eq("person_id", personId);

  if (!rules || rules.length === 0) return false;

  // Check specific date override first
  const specific = rules.find(
    (r: Record<string, unknown>) => r.specific_date === bookingDate
  );
  if (specific) {
    if (!specific.is_available) return false;
    return session === "morning"
      ? specific.morning_available
      : specific.afternoon_available;
  }

  // Fall back to weekly rule
  const weekly = rules.find(
    (r: Record<string, unknown>) => r.day_of_week === dow
  );
  if (!weekly || !weekly.is_available) return false;
  return session === "morning"
    ? weekly.morning_available
    : weekly.afternoon_available;
}

/**
 * Create a confirmed booking. Validates availability before inserting.
 */
export async function createBooking(input: {
  personId: string;
  userId: string;
  experienceSlug?: string;
  locationId?: string;
  bookingDate: string;
  session: BookingSession;
  groupSize: number;
  interpreterId?: string;
  notes?: string;
  totalPrice?: number;
  currency?: string;
  pricingRuleId?: string;
}): Promise<{ booking: Booking } | { error: string }> {
  // Check person is available per their rules
  const personAvailable = await isPersonAvailableForSlot(
    input.personId,
    input.bookingDate,
    input.session
  );
  if (!personAvailable) {
    return { error: "This person is not available for the selected slot" };
  }

  // Check slot is not already booked
  const slotFree = await isSlotAvailable(
    input.personId,
    input.bookingDate,
    input.session
  );
  if (!slotFree) {
    return { error: "This slot is already booked" };
  }

  const times = SESSION_TIMES[input.session];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      person_id: input.personId,
      user_id: input.userId,
      experience_slug: input.experienceSlug ?? null,
      location_id: input.locationId ?? null,
      booking_date: input.bookingDate,
      session: input.session,
      start_time: times.start,
      end_time: times.end,
      group_size: input.groupSize,
      interpreter_id: input.interpreterId ?? null,
      notes: input.notes ?? null,
      total_price: input.totalPrice ?? null,
      currency: input.currency ?? "JPY",
      pricing_rule_id: input.pricingRuleId ?? null,
      status: "confirmed",
    })
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to create booking", error);
    // Unique constraint violation = double-book race condition
    if (error.code === "23505") {
      return { error: "This slot was just booked by someone else" };
    }
    return { error: "Failed to create booking" };
  }

  return { booking: data as Booking };
}

/**
 * Get all bookings for a user, optionally filtered.
 */
export async function getUserBookings(
  userId: string,
  filters?: { status?: BookingStatus; upcoming?: boolean }
): Promise<BookingWithPerson[]> {
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select(
      `
      *,
      person:people!bookings_person_id_fkey(name, type, slug, photo_url, city),
      interpreter:people!bookings_interpreter_id_fkey(name, slug)
      `
    )
    .eq("user_id", userId)
    .order("booking_date", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.upcoming) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.gte("booking_date", today);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch user bookings", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...(row as unknown as Booking),
    person: row.person as unknown as BookingWithPerson["person"],
    interpreter: row.interpreter as unknown as BookingWithPerson["interpreter"],
  }));
}

/**
 * Cancel a booking. Only the owner can cancel.
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  reason?: string
): Promise<{ booking: Booking } | { error: string }> {
  const supabase = await createClient();

  // Verify ownership + current status
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, user_id, status")
    .eq("id", bookingId)
    .single();

  if (!existing) return { error: "Booking not found" };
  if (existing.user_id !== userId) return { error: "Not authorized" };
  if (existing.status !== "confirmed") {
    return { error: "Only confirmed bookings can be cancelled" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to cancel booking", error);
    return { error: "Failed to cancel booking" };
  }

  return { booking: data as Booking };
}

/**
 * Get booked slots for a person in a given month.
 * Returns set of "YYYY-MM-DD:session" strings for confirmed bookings.
 */
export async function getPersonBookedSlots(
  personId: string,
  year: number,
  month: number // 1-based
): Promise<Set<string>> {
  const supabase = await createClient();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("bookings")
    .select("booking_date, session")
    .eq("person_id", personId)
    .eq("status", "confirmed")
    .gte("booking_date", startDate)
    .lt("booking_date", endDate);

  const slots = new Set<string>();
  for (const row of data ?? []) {
    slots.add(`${row.booking_date}:${row.session}`);
  }
  return slots;
}
