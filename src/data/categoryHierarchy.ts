import { CategoryHierarchy, SubType } from "@/types/filters";
import { Location } from "@/types/location";

/**
 * Category hierarchy with sub-types for filtering.
 * Categories map to the database 'category' field.
 * Sub-types are derived from googlePrimaryType or name patterns.
 */
export const CATEGORY_HIERARCHY: CategoryHierarchy[] = [
  {
    id: "culture",
    label: "Culture",
    icon: "culture",
    subTypes: [
      {
        id: "shrine",
        label: "Shrine",
        patterns: [/shrine|torii|inari|jinja/i],
        googleTypes: ["shinto_shrine", "place_of_worship"],
      },
      {
        id: "temple",
        label: "Temple",
        patterns: [/temple|dera|ji\b/i],
        googleTypes: ["buddhist_temple", "hindu_temple"],
      },
      {
        id: "museum",
        label: "Museum",
        patterns: [/museum/i],
        googleTypes: ["museum", "art_gallery"],
      },
      {
        id: "landmark",
        label: "Landmark",
        patterns: [/castle|palace|monument|tower|historic/i],
        googleTypes: ["castle", "historical_landmark", "monument", "palace"],
      },
      {
        id: "performing_arts",
        label: "Performing Arts",
        patterns: [/theatre|theater|kabuki|concert|hall|studio|opera/i],
        googleTypes: ["performing_arts_theater", "concert_hall", "cultural_center"],
      },
    ],
  },
  {
    id: "food",
    label: "Food",
    icon: "food",
    subTypes: [
      {
        id: "restaurant",
        label: "Restaurant",
        patterns: [/restaurant|dining|ramen|sushi|yakitori|izakaya|curry/i],
        googleTypes: ["restaurant", "japanese_restaurant", "sushi_restaurant", "ramen_restaurant"],
      },
      {
        id: "cafe",
        label: "Cafe",
        patterns: [/cafe|coffee|bakery|dessert/i],
        googleTypes: ["cafe", "coffee_shop", "bakery"],
      },
      {
        id: "bar",
        label: "Bar",
        patterns: [/bar|sake|pub|izakaya/i],
        googleTypes: ["bar", "night_club"],
      },
      {
        id: "market",
        label: "Market",
        patterns: [/market|fish market|food hall/i],
        googleTypes: ["market", "supermarket", "grocery_store"],
      },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    icon: "nature",
    subTypes: [
      {
        id: "park",
        label: "Park",
        patterns: [/park|garden|grove/i],
        googleTypes: ["park", "city_park", "dog_park"],
      },
      {
        id: "garden",
        label: "Garden",
        patterns: [/garden|botanical/i],
        googleTypes: ["botanical_garden"],
      },
      {
        id: "beach",
        label: "Beach",
        patterns: [/beach|coast|bay/i],
        googleTypes: ["beach"],
      },
      {
        id: "mountain",
        label: "Mountain",
        patterns: [/mountain|mt\.|mount|hiking|trail/i],
        googleTypes: ["hiking_area", "national_park"],
      },
      {
        id: "onsen",
        label: "Onsen",
        patterns: [/onsen|hot spring|bath|spa/i],
        googleTypes: ["spa", "hot_spring"],
      },
    ],
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: "shopping",
    subTypes: [
      {
        id: "mall",
        label: "Mall",
        patterns: [/mall|shopping center|department/i],
        googleTypes: ["shopping_mall", "department_store"],
      },
      {
        id: "street",
        label: "Shopping Street",
        patterns: [/street|arcade|shotengai|dori/i],
        googleTypes: ["pedestrian_zone"],
      },
      {
        id: "specialty",
        label: "Specialty Store",
        patterns: [/store|shop|boutique/i],
        googleTypes: ["store", "gift_shop", "clothing_store"],
      },
    ],
  },
  {
    id: "view",
    label: "View",
    icon: "view",
    subTypes: [
      {
        id: "viewpoint",
        label: "Viewpoint",
        patterns: [/view|scenic|lookout|observatory/i],
        googleTypes: ["tourist_attraction", "scenic_spot"],
      },
      {
        id: "tower",
        label: "Tower",
        patterns: [/tower|sky/i],
        googleTypes: ["tower", "observation_deck"],
      },
    ],
  },
];

/**
 * Get all sub-types for the given category IDs.
 */
export function getSubTypesForCategories(categoryIds: string[]): SubType[] {
  if (categoryIds.length === 0) return [];

  const subTypes: SubType[] = [];
  for (const categoryId of categoryIds) {
    const category = CATEGORY_HIERARCHY.find((c) => c.id === categoryId);
    if (category) {
      subTypes.push(...category.subTypes);
    }
  }
  return subTypes;
}

/**
 * Get a specific sub-type by ID from any category.
 */
export function getSubTypeById(subTypeId: string): SubType | undefined {
  for (const category of CATEGORY_HIERARCHY) {
    const subType = category.subTypes.find((st) => st.id === subTypeId);
    if (subType) return subType;
  }
  return undefined;
}

/**
 * Get the parent category for a sub-type ID.
 */
export function getCategoryForSubType(subTypeId: string): CategoryHierarchy | undefined {
  return CATEGORY_HIERARCHY.find((category) =>
    category.subTypes.some((st) => st.id === subTypeId)
  );
}

/**
 * Derive sub-type for a location based on googlePrimaryType or name patterns.
 * Returns the sub-type ID or null if no match.
 */
export function deriveSubType(location: Location): string | null {
  // First try to match by googlePrimaryType (most reliable)
  if (location.googlePrimaryType) {
    for (const category of CATEGORY_HIERARCHY) {
      for (const subType of category.subTypes) {
        if (subType.googleTypes.includes(location.googlePrimaryType)) {
          return subType.id;
        }
      }
    }
  }

  // Fall back to name pattern matching
  const name = location.name.toLowerCase();
  for (const category of CATEGORY_HIERARCHY) {
    for (const subType of category.subTypes) {
      for (const pattern of subType.patterns) {
        if (pattern.test(name)) {
          return subType.id;
        }
      }
    }
  }

  return null;
}

/**
 * Check if a location matches any of the given sub-types.
 */
export function locationMatchesSubTypes(
  location: Location,
  subTypeIds: string[]
): boolean {
  if (subTypeIds.length === 0) return true;

  // Check by googlePrimaryType first
  if (location.googlePrimaryType) {
    for (const subTypeId of subTypeIds) {
      const subType = getSubTypeById(subTypeId);
      if (subType && subType.googleTypes.includes(location.googlePrimaryType)) {
        return true;
      }
    }
  }

  // Fall back to name pattern matching
  const name = location.name.toLowerCase();
  for (const subTypeId of subTypeIds) {
    const subType = getSubTypeById(subTypeId);
    if (subType) {
      for (const pattern of subType.patterns) {
        if (pattern.test(name)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Maps database category values to their parent category ID.
 * Database stores: "shrine", "temple", "restaurant", etc.
 * Parent categories: "culture", "food", "nature", etc.
 */
const DATABASE_CATEGORY_TO_PARENT: Record<string, string> = {
  // Culture
  shrine: "culture",
  temple: "culture",
  museum: "culture",
  landmark: "culture",
  culture: "culture",
  performing_arts: "culture",
  // Food
  restaurant: "food",
  cafe: "food",
  bar: "food",
  market: "food",
  // Nature
  park: "nature",
  garden: "nature",
  beach: "nature",
  mountain: "nature",
  onsen: "nature",
  nature: "nature",
  wellness: "nature",
  // Shopping
  mall: "shopping",
  street: "shopping",
  specialty: "shopping",
  shopping: "shopping",
  // View
  viewpoint: "view",
  tower: "view",
  view: "view",
  // Entertainment
  entertainment: "entertainment",
  // Accommodation
  accommodation: "accommodation",
};

/**
 * Get the parent category ID for a database category value.
 * Database stores subtype-level values like "shrine", "temple", etc.
 * This maps them to parent categories like "culture", "food", etc.
 */
export function getParentCategoryForDatabaseCategory(dbCategory: string): string | null {
  return DATABASE_CATEGORY_TO_PARENT[dbCategory.toLowerCase()] ?? null;
}

/**
 * Get all category IDs.
 */
export function getAllCategoryIds(): string[] {
  return CATEGORY_HIERARCHY.map((c) => c.id);
}

/**
 * Get category by ID.
 */
export function getCategoryById(categoryId: string): CategoryHierarchy | undefined {
  return CATEGORY_HIERARCHY.find((c) => c.id === categoryId);
}
