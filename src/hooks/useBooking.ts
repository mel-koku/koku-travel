import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/context/ToastContext";
import { fetchWithTimeout } from "@/lib/utils/fetchWithTimeout";
import type {
  BookingWithPerson,
  BookingSession,
  CreateBookingInput,
  PriceBreakdown,
} from "@/types/person";

// --- Mutations ---

async function postBooking(
  input: CreateBookingInput
): Promise<{ booking: BookingWithPerson; price: PriceBreakdown | null }> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create booking");
  }
  return res.json();
}

export function useCreateBooking() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postBooking,
    onSuccess: () => {
      showToast("Booking confirmed.", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["person-booked-slots"] });
    },
    onError: (err: Error) => {
      showToast(err.message || "Booking failed. Try again.", {
        variant: "error",
      });
    },
  });
}

async function patchCancelBooking(input: {
  bookingId: string;
  reason?: string;
}): Promise<{ booking: BookingWithPerson }> {
  const res = await fetch(`/api/bookings/${input.bookingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: input.reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to cancel booking");
  }
  return res.json();
}

export function useCancelBooking() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchCancelBooking,
    onSuccess: () => {
      showToast("Booking cancelled.", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["person-booked-slots"] });
    },
    onError: (err: Error) => {
      showToast(err.message || "Cancellation failed.", { variant: "error" });
    },
  });
}

// --- Queries ---

export function useUserBookings(filters?: {
  status?: string;
  upcoming?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.upcoming) params.set("upcoming", "true");

  return useQuery<{ bookings: BookingWithPerson[] }>({
    queryKey: ["user-bookings", filters],
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout(`/api/bookings?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function usePersonBookedSlots(
  personSlug: string | null,
  month: string | null // YYYY-MM
) {
  return useQuery<{ bookedSlots: string[] }>({
    queryKey: ["person-booked-slots", personSlug, month],
    enabled: !!personSlug && !!month,
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout(
        `/api/people/${personSlug}/availability?month=${month}&includeBooked=true`,
        { signal }
      );
      if (!res.ok) throw new Error("Failed to fetch booked slots");
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useSlotAvailability(
  personId: string | null,
  date: string | null,
  session: BookingSession | null
) {
  return useQuery<{ available: boolean; reason?: string }>({
    queryKey: ["slot-availability", personId, date, session],
    enabled: !!personId && !!date && !!session,
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout(
        `/api/bookings/availability?personId=${personId}&date=${date}&session=${session}`,
        { signal }
      );
      if (!res.ok) throw new Error("Failed to check availability");
      return res.json();
    },
    staleTime: 15 * 1000,
  });
}

export function useBookingPrice(
  personId: string | null,
  groupSize: number,
  experienceSlug?: string,
  date?: string
) {
  return useQuery<{ price: PriceBreakdown | null }>({
    queryKey: ["booking-price", personId, groupSize, experienceSlug, date],
    enabled: !!personId,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ personId: personId! });
      params.set("groupSize", String(groupSize));
      if (experienceSlug) params.set("experienceSlug", experienceSlug);
      if (date) params.set("date", date);
      const res = await fetchWithTimeout(`/api/bookings/pricing?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
