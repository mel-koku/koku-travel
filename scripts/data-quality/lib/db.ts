/**
 * Supabase client singleton for data quality scripts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { Location } from './types';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

/**
 * Fetch all locations from the database (handles pagination for >1000 records)
 */
export async function fetchAllLocations(): Promise<Location[]> {
  const supabase = getSupabase();
  const allLocations: Location[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, city, region, category, description, editorial_summary, place_id, coordinates, business_status, rating, review_count, operating_hours, google_primary_type, google_types')
      .order('name')
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch locations: ${error.message}`);
    }

    if (data && data.length > 0) {
      allLocations.push(...(data as Location[]));
      offset += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allLocations;
}

/**
 * Fetch locations with optional filters
 */
export async function fetchLocations(options: {
  city?: string;
  region?: string;
  category?: string;
  limit?: number;
} = {}): Promise<Location[]> {
  const supabase = getSupabase();

  let query = supabase
    .from('locations')
    .select('id, name, city, region, category, description, editorial_summary, place_id, coordinates, business_status, rating, review_count, operating_hours, google_primary_type, google_types');

  if (options.city) {
    query = query.ilike('city', options.city);
  }

  if (options.region) {
    query = query.ilike('region', options.region);
  }

  if (options.category) {
    query = query.eq('category', options.category);
  }

  query = query.order('name');

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch locations: ${error.message}`);
  }

  return (data || []) as Location[];
}

/**
 * Update a location
 */
export async function updateLocation(
  id: string,
  updates: Partial<Pick<Location, 'name' | 'description' | 'category' | 'editorial_summary'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a location
 */
export async function deleteLocation(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get a single location by ID
 */
export async function getLocationById(id: string): Promise<Location | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('locations')
    .select('id, name, city, region, category, description, editorial_summary, place_id, coordinates, business_status, rating, review_count, operating_hours, google_primary_type, google_types')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Location;
}

/**
 * Check if a location ID exists
 */
export async function locationIdExists(id: string): Promise<boolean> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('id', id)
    .single();

  return !error && data !== null;
}

// Columns that are generated and should not be included in inserts
const GENERATED_COLUMNS = ['name_search_vector'];

/**
 * Update location ID across all tables (primary key change)
 *
 * This function handles updating a location's ID which is a primary key.
 * It updates all related tables that reference the location ID:
 * - locations (primary)
 * - place_details (location_id)
 * - favorites (location_id)
 * - travel_guidance (location_ids array)
 * - guides (location_ids array)
 * - location_availability (handled by CASCADE on FK)
 */
export async function updateLocationId(
  oldId: string,
  newId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    // 1. First get the current location data
    const { data: locationData, error: fetchError } = await supabase
      .from('locations')
      .select('*')
      .eq('id', oldId)
      .single();

    if (fetchError || !locationData) {
      return { success: false, error: `Failed to fetch location: ${fetchError?.message || 'Not found'}` };
    }

    // 2. Insert new location with new ID (excluding generated columns)
    const newLocationData = { ...locationData, id: newId };
    for (const col of GENERATED_COLUMNS) {
      delete newLocationData[col];
    }
    const { error: insertError } = await supabase
      .from('locations')
      .insert(newLocationData);

    if (insertError) {
      return { success: false, error: `Failed to insert new location: ${insertError.message}` };
    }

    // 3. Update place_details if exists
    const { error: placeDetailsError } = await supabase
      .from('place_details')
      .update({ location_id: newId })
      .eq('location_id', oldId);

    if (placeDetailsError) {
      // Rollback: delete the new location
      await supabase.from('locations').delete().eq('id', newId);
      return { success: false, error: `Failed to update place_details: ${placeDetailsError.message}` };
    }

    // 4. Update favorites if exists
    const { error: favoritesError } = await supabase
      .from('favorites')
      .update({ location_id: newId })
      .eq('location_id', oldId);

    if (favoritesError) {
      // Rollback
      await supabase.from('place_details').update({ location_id: oldId }).eq('location_id', newId);
      await supabase.from('locations').delete().eq('id', newId);
      return { success: false, error: `Failed to update favorites: ${favoritesError.message}` };
    }

    // 5. Update travel_guidance location_ids array using array_replace
    const { error: guidanceError } = await supabase.rpc('array_replace_location_id', {
      table_name: 'travel_guidance',
      column_name: 'location_ids',
      old_id: oldId,
      new_id: newId,
    });

    // If RPC doesn't exist, try direct SQL approach or skip
    if (guidanceError && !guidanceError.message.includes('does not exist')) {
      console.warn(`Warning: Could not update travel_guidance: ${guidanceError.message}`);
    }

    // 6. Update guides location_ids array using array_replace
    const { error: guidesError } = await supabase.rpc('array_replace_location_id', {
      table_name: 'guides',
      column_name: 'location_ids',
      old_id: oldId,
      new_id: newId,
    });

    // If RPC doesn't exist, try direct SQL approach or skip
    if (guidesError && !guidesError.message.includes('does not exist')) {
      console.warn(`Warning: Could not update guides: ${guidesError.message}`);
    }

    // 7. Delete the old location (CASCADE will handle location_availability)
    const { error: deleteError } = await supabase
      .from('locations')
      .delete()
      .eq('id', oldId);

    if (deleteError) {
      // This is problematic - we have the new location but couldn't delete old
      return { success: false, error: `Failed to delete old location: ${deleteError.message}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
