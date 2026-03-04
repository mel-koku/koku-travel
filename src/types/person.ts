export type PersonType = "artisan" | "guide" | "interpreter" | "host";
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
