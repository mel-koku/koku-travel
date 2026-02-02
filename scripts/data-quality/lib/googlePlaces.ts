/**
 * Google Places API wrapper for data quality scripts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { delay } from './utils';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1';
const RATE_LIMIT_DELAY = 200; // ms between requests

interface PlaceDetails {
  displayName?: { text: string };
  editorialSummary?: { text: string };
  generativeSummary?: { overview?: { text: string } };
  types?: string[];
}

interface NearbyPlace {
  id: string;
  displayName: { text: string };
  types?: string[];
}

/**
 * Get display name for a place by its ID
 */
export async function getPlaceDisplayName(placeId: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'displayName,types',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API error for ${placeId}: ${response.status} ${errorText}`);
      return null;
    }

    const data = (await response.json()) as PlaceDetails;
    await delay(RATE_LIMIT_DELAY);

    return data.displayName?.text || null;
  } catch (error) {
    console.error(`Error fetching place ${placeId}:`, error);
    return null;
  }
}

/**
 * Get editorial or generative summary for a place
 */
export async function getPlaceSummary(placeId: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'editorialSummary,generativeSummary',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API error for ${placeId}: ${response.status} ${errorText}`);
      return null;
    }

    const data = (await response.json()) as PlaceDetails;
    await delay(RATE_LIMIT_DELAY);

    // Prefer editorial summary, fall back to generative
    return data.editorialSummary?.text || data.generativeSummary?.overview?.text || null;
  } catch (error) {
    console.error(`Error fetching summary for ${placeId}:`, error);
    return null;
  }
}

/**
 * Get full place details (name + summary)
 */
export async function getPlaceDetails(placeId: string): Promise<{
  name: string | null;
  summary: string | null;
}> {
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set');
    return { name: null, summary: null };
  }

  try {
    const response = await fetch(`${BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'displayName,editorialSummary,generativeSummary,types',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API error for ${placeId}: ${response.status} ${errorText}`);
      return { name: null, summary: null };
    }

    const data = (await response.json()) as PlaceDetails;
    await delay(RATE_LIMIT_DELAY);

    return {
      name: data.displayName?.text || null,
      summary: data.editorialSummary?.text || data.generativeSummary?.overview?.text || null,
    };
  } catch (error) {
    console.error(`Error fetching details for ${placeId}:`, error);
    return { name: null, summary: null };
  }
}

/**
 * Search for nearby places by coordinates
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number = 100,
  maxResults: number = 5
): Promise<NearbyPlace[]> {
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not set');
    return [];
  }

  try {
    const response = await fetch(`${BASE_URL}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.types',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        includedTypes: ['place_of_worship', 'tourist_attraction'],
        maxResultCount: maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places nearby search error: ${response.status} ${errorText}`);
      return [];
    }

    const data = (await response.json()) as { places?: NearbyPlace[] };
    await delay(RATE_LIMIT_DELAY);

    return data.places || [];
  } catch (error) {
    console.error('Error in nearby search:', error);
    return [];
  }
}

/**
 * Check if API key is configured
 */
export function isGooglePlacesConfigured(): boolean {
  return !!GOOGLE_API_KEY;
}
