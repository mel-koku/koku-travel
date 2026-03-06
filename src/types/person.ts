/** Bookable marketplace types: artisan, guide, interpreter. author = editorial only (not bookable). */
export type PersonType = "artisan" | "guide" | "interpreter" | "author";
export type PersonRole = "lead" | "assistant" | "interpreter";

export type Person = {
  id: string;
  type: PersonType;
  name: string;
  name_japanese?: string;
  slug: string;
  bio?: string;
  photo_url?: string;
  city?: string;
  prefecture?: string;
  region?: string;
  languages: string[];
  specialties: string[];
  years_experience?: number;
  license_number?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  guide_count?: number;
  is_published: boolean;
  sanity_slug?: string;
  created_at: string;
  updated_at: string;
};

export type PersonExperience = {
  id: string;
  person_id: string;
  experience_slug: string;
  role: PersonRole;
  is_primary: boolean;
};

/** Person with their role on a specific experience — used for display */
export type ExperiencePerson = Person & {
  role: PersonRole;
  is_primary: boolean;
};

/** Person with linked experience slugs — used for detail panel */
export type PersonWithExperiences = Person & {
  experiences: { slug: string; role: PersonRole; is_primary: boolean }[];
};

/** Booking inquiry DB row */
export type BookingInquiry = {
  id: string;
  person_id: string;
  user_id: string;
  contact_email: string;
  preferred_dates_start: string | null;
  preferred_dates_end: string | null;
  group_size: number | null;
  message: string | null;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  created_at: string;
  updated_at: string;
};

/** Form submission payload for creating a booking inquiry */
export type BookingInquiryInput = {
  personId: string;
  contactEmail: string;
  preferredDatesStart?: string;
  preferredDatesEnd?: string;
  groupSize?: number;
  message?: string;
};

/** Booking session type */
export type BookingSession = "morning" | "afternoon";

/** Booking status */
export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

/** Booking DB row */
export type Booking = {
  id: string;
  inquiry_id: string | null;
  person_id: string;
  experience_slug: string | null;
  location_id: string | null;
  user_id: string;
  booking_date: string; // YYYY-MM-DD
  session: BookingSession;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  group_size: number;
  interpreter_id: string | null;
  notes: string | null;
  total_price: number | null;
  currency: string;
  pricing_rule_id: string | null;
  status: BookingStatus;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

/** Booking with joined person data for display */
export type BookingWithPerson = Booking & {
  person: Pick<Person, "name" | "type" | "slug" | "photo_url" | "city">;
  interpreter?: Pick<Person, "name" | "slug"> | null;
};

/** Form submission payload for creating a booking */
export type CreateBookingInput = {
  personId: string;
  personSlug: string;
  experienceSlug?: string;
  locationId?: string;
  bookingDate: string; // YYYY-MM-DD
  session: BookingSession;
  groupSize: number;
  interpreterId?: string;
  notes?: string;
};

/** Pricing rule DB row */
export type PricingRule = {
  id: string;
  person_id: string;
  experience_slug: string | null;
  base_price: number;
  currency: string;
  per_person_price: number | null;
  min_group: number;
  max_group: number;
  duration_minutes: number | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
};

/** Computed price breakdown for display */
export type PriceBreakdown = {
  basePrice: number;
  perPersonPrice: number;
  extraGuests: number;
  totalPrice: number;
  currency: string;
  durationMinutes: number | null;
  maxGroup: number;
};
