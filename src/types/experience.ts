export type ExperienceType =
  | "workshop"
  | "cruise"
  | "tour"
  | "experience"
  | "adventure"
  | "rental";

export type Difficulty = "easy" | "moderate" | "challenging";

export type ExperienceSummary = {
  _id: string;
  title: string;
  slug: string;
  subtitle?: string;
  summary: string;
  featuredImage: { url?: string };
  thumbnailImage?: { url?: string };
  experienceType: ExperienceType;
  duration?: string;
  difficulty?: Difficulty;
  estimatedCost?: string;
  city?: string;
  region?: string;
  locationIds?: string[];
  readingTimeMinutes?: number;
  tags?: string[];
  publishedAt?: string;
};
