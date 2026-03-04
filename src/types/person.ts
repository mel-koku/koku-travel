export type PersonType = "artisan" | "guide" | "interpreter" | "host" | "author";
export type PersonRole = "lead" | "assistant" | "interpreter" | "host";

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
