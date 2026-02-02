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
      .select('id, name, city, region, category, description, editorial_summary, place_id, coordinates')
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
    .select('id, name, city, region, category, description, editorial_summary, place_id, coordinates');

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
    .select('id, name, city, region, category, description, editorial_summary, place_id, coordinates')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Location;
}
