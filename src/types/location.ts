export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type LocationOperatingPeriod = {
  day: Weekday;
  /**
   * 24-hour formatted opening time (HH:MM). Use "00:00" for always-open.
   */
  open: string;
  /**
   * 24-hour formatted closing time (HH:MM). When the location remains open
   * past midnight, set `isOvernight` to true to indicate the close occurs on
   * the following day.
   */
  close: string;
  /**
   * Marks whether the closing time spills into the next calendar day.
   */
  isOvernight?: boolean;
};

export type LocationOperatingHours = {
  /**
   * IANA timezone identifier used to interpret operating window times.
   */
  timezone: string;
  periods: LocationOperatingPeriod[];
  /**
   * Optional free-form annotation for seasonal hours or exceptions.
   */
  notes?: string;
};

export type LocationVisitRecommendation = {
  /**
   * Typical amount of time (in minutes) a traveler should allocate.
   */
  typicalMinutes: number;
  /**
   * Optional minimum time (in minutes) to experience the essentials.
   */
  minMinutes?: number;
  /**
   * Optional maximum time (in minutes) before the visit starts to feel long.
   */
  maxMinutes?: number;
  /**
   * Optional contextual description surfaced in UI.
   */
  summary?: string;
};

export type LocationTransitMode =
  | "walk"
  | "train"
  | "subway"
  | "bus"
  | "car"
  | "bicycle"
  | "tram"
  | "ferry"
  | "taxi";

export type Location = {
  id: string;
  name: string;
  region: string;
  city: string;
  /**
   * Neighborhood or district within the city (e.g., "Gion", "Arashiyama", "Higashiyama").
   * Used for geographic diversity scoring in itinerary generation.
   */
  neighborhood?: string;
  /**
   * Prefecture (administrative division) where the location is situated.
   * Used for geographic filtering in the explore page.
   */
  prefecture?: string;
  category: string;
  image: string;
  /**
   * AI-generated editorial description of the location.
   * Used as fallback when Google Places editorialSummary is not available.
   */
  description?: string;
  minBudget?: string;
  estimatedDuration?: string;
  /**
   * Optional structured representation of when the location is open.
   */
  operatingHours?: LocationOperatingHours;
  /**
   * Structured guidance for how long to stay at this location.
   */
  recommendedVisit?: LocationVisitRecommendation;
  /**
   * Hints for the most convenient ways to travel to this location.
   */
  preferredTransitModes?: LocationTransitMode[];
  /**
   * Optional precise coordinates used for routing calculations.
   */
  coordinates?: {
    lat: number;
    lng: number;
  };
  /**
   * IANA timezone identifier for the location if different from operatingHours.
   */
  timezone?: string;
  /**
   * Optional short description that can be displayed on summary cards.
   * When absent the UI will generate a sensible fallback string.
   */
  shortDescription?: string;
  /**
   * Optional average visitor rating (0–5). Missing values will be replaced
   * with a deterministic fallback so the UI can still surface a rating.
   */
  rating?: number;
  /**
   * Optional number of reviews supporting the rating. Like ratings, a
   * fallback value will be generated when this field is undefined.
   */
  reviewCount?: number;
  /**
   * Optional pre-defined Google Place ID.
   * If not provided the application will resolve it dynamically.
   */
  placeId?: string;
  /**
   * Optional primary photo URL from Google Places API.
   * Stored in database to eliminate N+1 query problem.
   */
  primaryPhotoUrl?: string;
  /**
   * Accessibility information for the location (legacy structure)
   * @deprecated Use accessibilityOptions from Google Places enrichment instead
   */
  accessibility?: {
    /**
     * Whether the location is wheelchair accessible
     */
    wheelchairAccessible?: boolean;
    /**
     * Whether an elevator is required or available
     */
    elevatorRequired?: boolean;
    /**
     * Whether step-free access is available
     */
    stepFreeAccess?: boolean;
    /**
     * Additional accessibility notes
     */
    notes?: string;
  };

  // ============================================
  // Google Places Enrichment Fields
  // ============================================

  /**
   * Primary type from Google Places API (e.g., "buddhist_temple", "castle", "restaurant")
   * More specific than our generic category field
   */
  googlePrimaryType?: string;

  /**
   * Array of all types from Google Places API
   * A location can have multiple types (e.g., ["tourist_attraction", "museum", "point_of_interest"])
   */
  googleTypes?: string[];

  /**
   * Business status from Google Places API
   * Used to filter out closed locations from itinerary planning
   */
  businessStatus?: 'OPERATIONAL' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED';

  /**
   * Price level from Google Places API (0-4)
   * 0 = Free, 1 = Inexpensive ($), 2 = Moderate ($$), 3 = Expensive ($$$), 4 = Very Expensive ($$$$)
   */
  priceLevel?: 0 | 1 | 2 | 3 | 4;

  /**
   * Accessibility options from Google Places API
   */
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };

  /**
   * Dietary options from Google Places API (for restaurants)
   */
  dietaryOptions?: {
    servesVegetarianFood?: boolean;
  };

  /**
   * Service options from Google Places API (for restaurants)
   */
  serviceOptions?: {
    dineIn?: boolean;
    takeout?: boolean;
    delivery?: boolean;
  };

  /**
   * Meal options from Google Places API (for restaurants)
   */
  mealOptions?: {
    servesBreakfast?: boolean;
    servesBrunch?: boolean;
    servesLunch?: boolean;
    servesDinner?: boolean;
  };

  /**
   * Whether the location is suitable for children/families
   */
  goodForChildren?: boolean;

  /**
   * Whether the location is suitable for groups
   */
  goodForGroups?: boolean;

  /**
   * Whether outdoor seating is available
   */
  outdoorSeating?: boolean;

  /**
   * Whether the location accepts reservations
   */
  reservable?: boolean;

  /**
   * Google's editorial summary of the location
   */
  editorialSummary?: string;

  /**
   * Manually curated flag to mark locations for featured carousel display
   * Used for editor-selected featured destinations
   */
  isFeatured?: boolean;
};

export type LocationReview = {
  authorName: string;
  rating?: number;
  text?: string;
  relativePublishTimeDescription?: string;
  profilePhotoUri?: string;
  authorUri?: string;
  publishTime?: string;
};

export type LocationPhotoAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

export type LocationPhoto = {
  name: string;
  widthPx?: number;
  heightPx?: number;
  proxyUrl: string;
  attributions: LocationPhotoAttribution[];
};

export type LocationDetails = {
  placeId: string;
  displayName?: string;
  formattedAddress?: string;
  shortAddress?: string;
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  regularOpeningHours?: string[];
  currentOpeningHours?: string[];
  reviews: LocationReview[];
  photos: LocationPhoto[];
  fetchedAt: string;
};

export type LocationDetailsResponse = {
  location: Location;
  details: LocationDetails;
};
