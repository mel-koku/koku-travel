/**
 * Transformation functions for Google Places API responses.
 *
 * This module provides functions to transform raw API responses
 * into our internal LocationDetails, LocationReview, and LocationPhoto types.
 */

import type { LocationDetails, LocationPhoto, LocationReview } from "@/types/location";

const MAX_REVIEWS = 5;
const MAX_PHOTOS = 8;

/**
 * Raw review data from Google Places API.
 */
export type PlaceReviewPayload = {
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
  rating?: number;
  text?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
};

/**
 * Raw photo data from Google Places API.
 */
export type PlacePhotoPayload = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
    photoUri?: string;
  }>;
};

/**
 * Raw place details payload from Google Places API.
 */
export type PlaceDetailsPayload = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: { text?: string };
  websiteUri?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  currentOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: PlaceReviewPayload[];
  photos?: PlacePhotoPayload[];
};

/**
 * Transform raw reviews from Google Places API to LocationReview format.
 *
 * @param reviews - Raw review data from API
 * @returns Array of LocationReview objects (max 5)
 */
export function transformReviews(reviews?: PlaceReviewPayload[]): LocationReview[] {
  if (!reviews) return [];
  return reviews
    .filter((review) => Boolean(review))
    .slice(0, MAX_REVIEWS)
    .map((review) => ({
      authorName: review?.authorAttribution?.displayName ?? "Google user",
      authorUri: review?.authorAttribution?.uri,
      profilePhotoUri: review?.authorAttribution?.photoUri,
      rating: review?.rating,
      text: review?.text?.text,
      relativePublishTimeDescription: review?.relativePublishTimeDescription,
      publishTime: review?.publishTime,
    }));
}

/**
 * Transform raw photos from Google Places API to LocationPhoto format.
 *
 * @param photos - Raw photo data from API
 * @returns Array of LocationPhoto objects (max 8)
 */
export function transformPhotos(photos?: PlacePhotoPayload[]): LocationPhoto[] {
  if (!photos) return [];

  return photos
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo?.name))
    .slice(0, MAX_PHOTOS)
    .map((photo) => ({
      name: photo.name!,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      proxyUrl: `/api/places/photo?photoName=${encodeURIComponent(photo.name!)}&maxWidthPx=1600`,
      attributions: (photo.authorAttributions ?? []).map((attribution) => ({
        displayName: attribution?.displayName,
        uri: attribution?.uri,
        photoUri: attribution?.photoUri,
      })),
    }));
}

/**
 * Transform raw place details from Google Places API to LocationDetails format.
 *
 * @param payload - Raw place details from API
 * @param fallbackPlaceId - Place ID to use if not in payload
 * @returns LocationDetails object
 */
export function transformPlaceDetails(
  payload: PlaceDetailsPayload,
  fallbackPlaceId: string,
): LocationDetails {
  return {
    placeId: payload.id ?? fallbackPlaceId,
    displayName: payload.displayName?.text,
    formattedAddress: payload.formattedAddress,
    shortAddress: payload.shortFormattedAddress,
    rating: payload.rating,
    userRatingCount: payload.userRatingCount,
    editorialSummary: payload.editorialSummary?.text,
    websiteUri: payload.websiteUri,
    internationalPhoneNumber: payload.internationalPhoneNumber,
    googleMapsUri: payload.googleMapsUri,
    regularOpeningHours: payload.regularOpeningHours?.weekdayDescriptions ?? [],
    currentOpeningHours: payload.currentOpeningHours?.weekdayDescriptions ?? [],
    reviews: transformReviews(payload.reviews),
    photos: transformPhotos(payload.photos),
    fetchedAt: new Date().toISOString(),
  };
}
