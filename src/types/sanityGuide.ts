import type { GuideType } from "./guide";

export type SanityImageAsset = {
  _type: "image";
  asset: { _ref: string };
  url?: string;
  dimensions?: { width: number; height: number; aspectRatio: number };
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
  caption?: string;
};

export type SanityAuthor = {
  name: string;
  slug: string;
  photo?: SanityImageAsset & { url?: string };
  bio?: string;
  city?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
};

export type SanityGuide = {
  _id: string;
  title: string;
  slug: string;
  subtitle?: string;
  summary: string;
  body: unknown[];
  featuredImage: SanityImageAsset & { url?: string };
  thumbnailImage?: SanityImageAsset & { url?: string };
  author: SanityAuthor;
  guideType: GuideType;
  tags?: string[];
  city?: string;
  region?: string;
  locationIds: string[];
  readingTimeMinutes?: number;
  editorialStatus: "draft" | "in_review" | "published" | "archived";
  featured: boolean;
  sortOrder: number;
  publishedAt?: string;
  _createdAt: string;
  _updatedAt: string;
};

export type SanityAuthorFull = SanityAuthor & {
  _id: string;
  guideCount: number;
  guides: Array<{
    _id: string;
    title: string;
    slug: string;
    summary: string;
    featuredImage: string;
    guideType: GuideType;
    city?: string;
    region?: string;
    readingTimeMinutes?: number;
    tags?: string[];
    publishedAt?: string;
  }>;
};

export type SanityAuthorSummary = {
  _id: string;
  name: string;
  slug: string;
  photo?: SanityImageAsset & { url?: string };
  bio?: string;
  city?: string;
  guideCount: number;
};
