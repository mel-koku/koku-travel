import type { SanityImageAsset, SanityAuthor } from "./sanityGuide";

export type BlogCategory =
  | "itineraries"
  | "food-drink"
  | "culture"
  | "seasonal"
  | "budget"
  | "hidden-gems"
  | "practical-tips"
  | "neighborhoods";

export type SanityBlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: unknown[];
  featuredImage: SanityImageAsset & { url?: string };
  author: SanityAuthor;
  category: BlogCategory;
  tags?: string[];
  city?: string;
  region?: string;
  readingTimeMinutes?: number;
  editorialStatus: "draft" | "in_review" | "published" | "archived";
  featured: boolean;
  publishedAt?: string;
  _createdAt: string;
  _updatedAt: string;
};

export type SanityBlogPostSummary = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: SanityImageAsset & { url?: string };
  author: Pick<SanityAuthor, "name" | "slug" | "photo">;
  category: BlogCategory;
  tags?: string[];
  city?: string;
  region?: string;
  readingTimeMinutes?: number;
  featured: boolean;
  publishedAt?: string;
};
