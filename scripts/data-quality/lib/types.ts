/**
 * Unified Data Quality System - Type Definitions
 */

// Issue types detected by the audit system
export type IssueType =
  // Name issues
  | 'EVENT_NAME_MISMATCH'    // Event name but describes a shrine/temple
  | 'NAME_ID_MISMATCH'       // ID slug doesn't match name slug
  | 'ALL_CAPS_NAME'          // Name in all caps
  | 'BAD_NAME_START'         // Name starts with special character
  | 'GENERIC_PLURAL_NAME'    // Generic plural like "Ramen Shops"
  | 'GENERIC_ARTICLE_NAME'   // Names like "The X"
  | 'TRUNCATED_NAME'         // Name appears cut off (e.g., "Kyoto Imperial" instead of "Kyoto Imperial Palace")
  | 'SHORT_INCOMPLETE_NAME'  // Single-word name for culture/landmark/museum (e.g., "Kawasaki" instead of "Kawasaki World")
  | 'CITY_SPELLING_VARIANT'  // City name needs normalization (e.g., "Amakusa, Kumamoto" -> "Amakusa")
  | 'NAME_CITY_MISMATCH'     // Location name contains a different city name
  // Description issues
  | 'ADDRESS_AS_DESC'        // Description is just an address/postal code
  | 'TRUNCATED_DESC'         // Description appears cut off (starts lowercase)
  | 'MISSING_DESC'           // No description
  | 'SHORT_INCOMPLETE_DESC'  // Very short, incomplete description
  | 'GENERIC_DESC'           // Generic placeholder description
  // Category issues
  | 'EVENT_WRONG_CATEGORY'   // Event name but wrong category
  | 'ACCOMMODATION_MISCATEGORIZED' // Accommodation that's actually a restaurant
  | 'LANDMARK_MISCATEGORIZED' // Landmark that's actually a food/bar establishment
  | 'CATEGORY_INVALID'       // Category not in allowed list
  | 'PREFECTURE_REGION_MISMATCH' // Prefecture doesn't match region assignment
  // Google Places mismatch issues (prevents data corruption)
  | 'GOOGLE_TYPE_MISMATCH'   // Google type doesn't match our category (e.g., airport for restaurant)
  | 'GOOGLE_AIRPORT_MISMATCH' // Google says airport but name doesn't contain "airport"
  | 'GOOGLE_CONTENT_MISMATCH' // Short description content conflicts with editorial summary
  | 'GOOGLE_NAME_MISMATCH'   // Single-word name differs from Google displayName
  // Duplicate issues
  | 'DUPLICATE_SAME_CITY'    // Same name in same city
  | 'DUPLICATE_MANY'         // Same name across multiple cities
  | 'DUPLICATE_COORDINATES'  // Multiple locations at exact same lat/lng
  // Completeness issues
  | 'MISSING_COORDINATES'    // No lat/lng
  | 'MISSING_PLACE_ID'       // No Google Place ID
  | 'PERMANENTLY_CLOSED'     // Business is permanently closed
  | 'MISSING_OPERATING_HOURS' // Missing operating hours for categories that need it
  | 'INVALID_RATING'         // Rating without review_count or out of range
  | 'INVALID_COORDINATES'    // Coordinates outside Japan bounds
  | 'UNREALISTIC_DURATION'   // Visit duration too short (<15 min) or too long (>8 hours)
  | 'MISSING_DURATION'       // No estimated_duration for categories that need it
  | 'SEASONAL_MISSING_TYPE'  // is_seasonal=true but no seasonal_type
  | 'FOOD_MISSING_MEAL_OPTIONS' // Food/restaurant without meal_options
  | 'COORDINATES_PRECISION_LOW'; // Low precision coordinates (<4 decimal places)

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Issue {
  id: string;
  type: IssueType;
  severity: Severity;
  locationId: string;
  locationName: string;
  city: string;
  region: string;
  message: string;
  details?: Record<string, unknown>;
  suggestedFix?: SuggestedFix;
}

export type FixAction = 'rename' | 'delete' | 'update_description' | 'update_category' | 'update_id' | 'update_region' | 'skip';

export interface SuggestedFix {
  action: FixAction;
  newValue?: string;
  reason: string;
  confidence: number; // 0-100
  source?: 'override' | 'google_places' | 'editorial_summary' | 'generated' | 'detection';
}

export interface FixResult {
  success: boolean;
  action: FixAction;
  locationId: string;
  message: string;
  previousValue?: string;
  newValue?: string;
  error?: string;
}

// Location data from database
export interface Location {
  id: string;
  name: string;
  city: string;
  region: string;
  category: string;
  description?: string | null;
  short_description?: string | null;
  editorial_summary?: string | null;
  place_id?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  // Google Places data
  google_primary_type?: string | null;
  google_types?: string[] | null;
  // Business status and ratings
  business_status?: string | null;
  rating?: number | null;
  review_count?: number | null;
  // Operating hours
  operating_hours?: Record<string, unknown> | null;
  // Additional fields for Phase 2 rules
  estimated_duration?: string | null;
  image?: string | null;
  primary_photo_url?: string | null;
  prefecture?: string | null;
  is_seasonal?: boolean | null;
  seasonal_type?: string | null;
  meal_options?: Record<string, boolean> | null;
  lat?: number | null;
  lng?: number | null;
  updated_at?: string | null;
}

// Rule system
export interface RuleContext {
  locations: Location[];
  overrides: Overrides;
  options: AuditOptions;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  issueTypes: IssueType[];
  detect(ctx: RuleContext): Promise<Issue[]>;
}

export type RuleCategory = 'names' | 'descriptions' | 'duplicates' | 'categories' | 'completeness' | 'google';

// Fixer system
export interface FixerContext {
  supabase: SupabaseClient;
  overrides: Overrides;
  dryRun: boolean;
  googleApiKey?: string;
}

export interface Fixer {
  handles: IssueType[];
  fix(issue: Issue, ctx: FixerContext): Promise<FixResult>;
}

// Override configuration
export interface Overrides {
  // Name corrections: locationId -> correct name
  names: Record<string, string>;

  // Description corrections: locationId -> correct description
  descriptions: Record<string, string>;

  // Duplicate resolutions: keep locationId, delete list of locationIds
  duplicates: Array<{
    keep: string;
    delete: string[];
    reason?: string;
  }>;

  // Locations to skip entirely (no issues reported)
  skip: string[];

  // Category corrections: locationId -> correct category
  categories: Record<string, string>;
}

// CLI Options
export interface AuditOptions {
  rules?: RuleCategory[];
  severity?: Severity;
  json?: boolean;
  limit?: number;
  city?: string;
  region?: string;
}

export interface FixOptions {
  dryRun: boolean;
  types?: IssueType[];
  limit?: number;
  city?: string;
}

export interface ReportOptions {
  json?: boolean;
  detailed?: boolean;
}

// Health report
export interface HealthReport {
  timestamp: string;
  totalLocations: number;
  issuesByType: Record<IssueType, number>;
  issuesBySeverity: Record<Severity, number>;
  healthScore: number; // 0-100
  topIssues: Issue[];
  recommendations: string[];
}

// Supabase client type (simplified)
export interface SupabaseClient {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: string): Promise<{ data: unknown[]; error: unknown }>;
      ilike(column: string, value: string): Promise<{ data: unknown[]; error: unknown }>;
      not(column: string, operator: string, value: unknown): Promise<{ data: unknown[]; error: unknown }>;
      in(column: string, values: string[]): Promise<{ data: unknown[]; error: unknown }>;
      order(column: string, options?: { ascending?: boolean }): unknown;
      limit(count: number): unknown;
      then(resolve: (result: { data: unknown[]; error: unknown }) => void): Promise<{ data: unknown[]; error: unknown }>;
    };
    update(data: Record<string, unknown>): {
      eq(column: string, value: string): Promise<{ data: unknown; error: unknown }>;
    };
    delete(): {
      eq(column: string, value: string): Promise<{ data: unknown; error: unknown }>;
    };
  };
}
