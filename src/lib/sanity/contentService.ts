import { sanityClient } from "@/sanity/client";
import {
  landingPageQuery,
  siteSettingsQuery,
  tripBuilderConfigQuery,
  pagesContentQuery,
} from "@/sanity/queries";
import type {
  LandingPageContent,
  SiteSettings,
  TripBuilderConfig,
  PagesContent,
} from "@/types/sanitySiteContent";

export async function getLandingPageContent(): Promise<LandingPageContent | null> {
  try {
    return await sanityClient.fetch<LandingPageContent | null>(landingPageQuery);
  } catch {
    return null;
  }
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    return await sanityClient.fetch<SiteSettings | null>(siteSettingsQuery);
  } catch {
    return null;
  }
}

export async function getTripBuilderConfig(): Promise<TripBuilderConfig | null> {
  try {
    return await sanityClient.fetch<TripBuilderConfig | null>(tripBuilderConfigQuery);
  } catch {
    return null;
  }
}

export async function getPagesContent(): Promise<PagesContent | null> {
  try {
    return await sanityClient.fetch<PagesContent | null>(pagesContentQuery);
  } catch {
    return null;
  }
}
