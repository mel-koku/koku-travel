import { describe, expect, it } from "vitest";

/**
 * We test calculateMatchScore directly by importing the module internals.
 * The function is not exported, so we use a re-export helper.
 */

// Re-create the scoring function signature for testing.
// We import the module and use vi.hoisted + dynamic import to access internals.

// Since calculateMatchScore is private, we test via buildCriteriaFromLocation
// patterns and a thin wrapper. For now, extract the logic we need to test.

// ---------------------------------------------------------------------------
// Inline the scoring function for unit testing (mirrors guidanceService.ts)
// ---------------------------------------------------------------------------

type GuidanceType =
  | "etiquette" | "practical" | "environmental" | "seasonal"
  | "accessibility" | "photography" | "budget" | "nightlife"
  | "family" | "solo" | "food_culture" | "cultural_context" | "transit";

type TravelGuidance = {
  id: string;
  title: string;
  summary: string;
  guidanceType: GuidanceType;
  tags: string[];
  categories: string[];
  regions: string[];
  cities: string[];
  locationIds: string[];
  seasons: string[];
  validMonths: number[];
  isUniversal: boolean;
  priority: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type GuidanceMatchCriteria = {
  category?: string;
  city?: string;
  region?: string;
  locationId?: string;
  season?: "spring" | "summer" | "fall" | "winter";
  month?: number;
  tags?: string[];
  locationName?: string;
};

// We'll import the actual function once it's exported for testing.
// For now, we test the module end-to-end via a test export.

// ---------------------------------------------------------------------------
// Helper: build a minimal TravelGuidance object
// ---------------------------------------------------------------------------
function makeTip(overrides: Partial<TravelGuidance> & { title: string }): TravelGuidance {
  return {
    id: "test-" + Math.random().toString(36).slice(2, 8),
    summary: "",
    guidanceType: "practical",
    tags: [],
    categories: [],
    regions: [],
    cities: [],
    locationIds: [],
    seasons: [],
    validMonths: [],
    isUniversal: false,
    priority: 5,
    status: "published",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import the actual scoring function (we'll add a test export)
// ---------------------------------------------------------------------------
import { _testCalculateMatchScore as calculateMatchScore } from "../guidanceService";

// ---------------------------------------------------------------------------
// Criteria helpers
// ---------------------------------------------------------------------------
// Note: planning city for Shibuya locations is "tokyo"
const gyukatsuMotomura: GuidanceMatchCriteria = {
  category: "restaurant",
  city: "tokyo",
  region: "kanto",
  locationId: "gyukatsu-motomura-shibuya",
  locationName: "Gyukatsu Motomura Shibuya",
  tags: ["restaurant", "food", "point_of_interest"],
  season: "spring",
  month: 4,
};

const fushimiInari: GuidanceMatchCriteria = {
  category: "shrine",
  city: "kyoto",
  region: "kansai",
  locationId: "fushimi-inari",
  locationName: "Fushimi Inari Taisha",
  tags: ["shrine", "place_of_worship"],
  season: "spring",
  month: 4,
};

const tsukijiMarket: GuidanceMatchCriteria = {
  category: "market",
  city: "tokyo",
  region: "kanto",
  locationId: "tsukiji-outer-market",
  locationName: "Tsukiji Outer Market",
  tags: ["market", "food", "point_of_interest"],
  season: "spring",
  month: 4,
};

const tokyoTemple: GuidanceMatchCriteria = {
  category: "temple",
  city: "tokyo",
  region: "kanto",
  locationId: "sensoji",
  locationName: "Senso-ji",
  tags: ["temple", "place_of_worship"],
  season: "spring",
  month: 4,
};

const tokyoRestaurant: GuidanceMatchCriteria = {
  category: "restaurant",
  city: "tokyo",
  region: "kanto",
  locationId: "random-sushi-bar",
  locationName: "Random Sushi Bar",
  tags: ["restaurant", "food"],
  season: "spring",
  month: 4,
};

// ===================================================================
// Tests
// ===================================================================

describe("calculateMatchScore", () => {
  // -----------------------------------------------------------------
  // BUG FIX: Tsukiji tips should NOT appear on unrelated restaurants
  // -----------------------------------------------------------------
  describe("specificity: venue-specific tips stay on their venues", () => {
    const tsukijiTip = makeTip({
      title: "Tsukiji Outer Market for Breakfast Bites",
      guidanceType: "food_culture",
      categories: ["restaurant", "market"],
      cities: ["tokyo"],
      regions: ["kanto"],
      tags: ["street-food", "tsukiji", "tokyo", "breakfast"],
      priority: 8,
    });

    it("should match Tsukiji Outer Market itself", () => {
      expect(calculateMatchScore(tsukijiTip, tsukijiMarket)).toBeGreaterThan(0);
    });

    it("should NOT match an unrelated restaurant like Gyukatsu Motomura", () => {
      expect(calculateMatchScore(tsukijiTip, gyukatsuMotomura)).toBe(0);
    });

    it("should NOT match a random sushi bar in Tokyo", () => {
      expect(calculateMatchScore(tsukijiTip, tokyoRestaurant)).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // BUG FIX: Empty categories should not match everything
  // -----------------------------------------------------------------
  describe("empty categories: non-universal tips gated by guidance_type", () => {
    const hotelPricesTip = makeTip({
      title: "Hotel Prices Rise Late March",
      guidanceType: "budget",
      categories: [],
      cities: ["kyoto", "tokyo", "osaka"],
      regions: ["kansai", "kanto"],
      tags: ["accommodation", "prices", "sakura-season", "booking"],
      priority: 8,
    });

    it("should NOT match a restaurant", () => {
      expect(calculateMatchScore(hotelPricesTip, gyukatsuMotomura)).toBe(0);
    });

    it("should NOT match a temple", () => {
      expect(calculateMatchScore(hotelPricesTip, tokyoTemple)).toBe(0);
    });

    it("should NOT match a shrine in Kyoto", () => {
      expect(calculateMatchScore(hotelPricesTip, fushimiInari)).toBe(0);
    });

    const transitTip = makeTip({
      title: "Tokyo Station Orientation",
      guidanceType: "transit",
      categories: [],
      cities: ["tokyo"],
      regions: ["kanto"],
      tags: ["station:tokyo", "exits", "navigation"],
      priority: 6,
    });

    it("transit tips with empty categories should NOT match restaurants", () => {
      expect(calculateMatchScore(transitTip, gyukatsuMotomura)).toBe(0);
    });

    it("transit tips with empty categories should NOT match temples", () => {
      expect(calculateMatchScore(transitTip, tokyoTemple)).toBe(0);
    });

    const accessibilityTip = makeTip({
      title: "Tokyo: Toei Oedo Line Fully Accessible",
      guidanceType: "accessibility",
      categories: [],
      cities: ["tokyo"],
      regions: ["kanto"],
      tags: ["subway", "elevator", "barrier-free"],
      priority: 7,
    });

    it("accessibility transit tips with empty categories should NOT match restaurants", () => {
      expect(calculateMatchScore(accessibilityTip, gyukatsuMotomura)).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // REGRESSION: Tips that correctly match should keep matching
  // -----------------------------------------------------------------
  describe("regression: correct matches still work", () => {
    const itadakimasuTip = makeTip({
      title: "Say Itadakimasu",
      guidanceType: "etiquette",
      categories: ["restaurant", "bar", "cafe"],
      cities: [],
      regions: [],
      tags: ["itadakimasu", "greeting", "dining", "gratitude"],
      priority: 7,
    });

    it("restaurant etiquette tip matches a restaurant", () => {
      expect(calculateMatchScore(itadakimasuTip, gyukatsuMotomura)).toBeGreaterThan(0);
    });

    it("restaurant etiquette tip matches another restaurant in a different city", () => {
      expect(calculateMatchScore(itadakimasuTip, tokyoRestaurant)).toBeGreaterThan(0);
    });

    it("restaurant etiquette tip does NOT match a shrine", () => {
      expect(calculateMatchScore(itadakimasuTip, fushimiInari)).toBe(0);
    });

    const templeShoesTip = makeTip({
      title: "Remove Shoes at Temples",
      guidanceType: "etiquette",
      categories: ["temple", "shrine"],
      cities: [],
      regions: [],
      tags: ["shoes", "temple", "shrine", "indoor"],
      priority: 8,
    });

    it("temple etiquette tip matches a shrine", () => {
      expect(calculateMatchScore(templeShoesTip, fushimiInari)).toBeGreaterThan(0);
    });

    it("temple etiquette tip matches a temple", () => {
      expect(calculateMatchScore(templeShoesTip, tokyoTemple)).toBeGreaterThan(0);
    });

    it("temple etiquette tip does NOT match a restaurant", () => {
      expect(calculateMatchScore(templeShoesTip, gyukatsuMotomura)).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // REGRESSION: Universal tips with category affinity
  // -----------------------------------------------------------------
  describe("regression: universal tips respect category affinity", () => {
    const universalFoodTip = makeTip({
      title: "Cash-Only Restaurants Are Common",
      guidanceType: "food_culture",
      categories: [],
      isUniversal: true,
      tags: ["cash", "payment"],
      priority: 6,
    });

    it("universal food_culture tip matches a restaurant", () => {
      expect(calculateMatchScore(universalFoodTip, gyukatsuMotomura)).toBeGreaterThan(0);
    });

    it("universal food_culture tip matches a market", () => {
      expect(calculateMatchScore(universalFoodTip, tsukijiMarket)).toBeGreaterThan(0);
    });

    it("universal food_culture tip does NOT match a shrine", () => {
      expect(calculateMatchScore(universalFoodTip, fushimiInari)).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // REGRESSION: Location-specific tips
  // -----------------------------------------------------------------
  describe("regression: location-specific tips", () => {
    const specificTip = makeTip({
      title: "Gyukatsu Motomura: Beat the Queue",
      guidanceType: "food_culture",
      categories: ["restaurant"],
      locationIds: ["gyukatsu-motomura-shibuya"],
      cities: ["tokyo"],
      tags: ["queue", "lunch"],
      priority: 9,
    });

    it("matches the exact location", () => {
      expect(calculateMatchScore(specificTip, gyukatsuMotomura)).toBeGreaterThan(0);
    });

    it("does NOT match a different restaurant", () => {
      expect(calculateMatchScore(specificTip, tokyoRestaurant)).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // REGRESSION: City/region exclusion still works
  // -----------------------------------------------------------------
  describe("regression: city/region gating", () => {
    const kyotoBusTip = makeTip({
      title: "Master the Kyoto City Bus",
      guidanceType: "practical",
      categories: ["temple", "shrine"],
      cities: ["kyoto"],
      regions: ["kansai"],
      tags: ["bus", "transport"],
      priority: 7,
    });

    it("matches a shrine in Kyoto", () => {
      expect(calculateMatchScore(kyotoBusTip, fushimiInari)).toBeGreaterThan(0);
    });

    it("does NOT match a temple in Tokyo", () => {
      expect(calculateMatchScore(kyotoBusTip, tokyoTemple)).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // REGRESSION: Season/month exclusion still works
  // -----------------------------------------------------------------
  describe("regression: season/month gating", () => {
    const summerTip = makeTip({
      title: "Stay Hydrated in Summer",
      guidanceType: "practical",
      categories: ["temple", "shrine", "park"],
      seasons: ["summer"],
      tags: ["heat", "water"],
      priority: 7,
    });

    it("does NOT match in spring", () => {
      expect(calculateMatchScore(summerTip, fushimiInari)).toBe(0);
    });

    it("matches in summer", () => {
      const summerCriteria = { ...fushimiInari, season: "summer" as const, month: 7 };
      expect(calculateMatchScore(summerTip, summerCriteria)).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------
  // Specificity tags: cuisine tips only match relevant restaurants
  // -----------------------------------------------------------------
  describe("specificity: cuisine tags gate properly", () => {
    const ramenTip = makeTip({
      title: "Slurping Is Expected at Ramen Shops",
      guidanceType: "food_culture",
      categories: ["restaurant"],
      tags: ["ramen", "noodles", "slurping"],
      priority: 7,
    });

    it("does NOT match a gyukatsu restaurant", () => {
      expect(calculateMatchScore(ramenTip, gyukatsuMotomura)).toBe(0);
    });

    it("matches a ramen restaurant", () => {
      const ramenShop: GuidanceMatchCriteria = {
        category: "restaurant",
        city: "tokyo",
        region: "kanto",
        locationName: "Ichiran Ramen Shibuya",
        tags: ["restaurant", "ramen_restaurant"],
        season: "spring",
        month: 4,
      };
      expect(calculateMatchScore(ramenTip, ramenShop)).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------
  // Edge case: tip with BOTH categories and specificity tags
  // -----------------------------------------------------------------
  describe("edge cases", () => {
    it("tip with no cities/regions/categories and not universal scores 0", () => {
      const orphanTip = makeTip({
        title: "Random Tip",
        guidanceType: "practical",
        categories: [],
        cities: [],
        regions: [],
        tags: [],
        priority: 5,
      });
      // No category match, no city, no region = score stays 0
      expect(calculateMatchScore(orphanTip, gyukatsuMotomura)).toBe(0);
    });

    it("nishiki market tip does not match a random Kyoto restaurant", () => {
      const nishikiTip = makeTip({
        title: "Nishiki Market Shopping Etiquette",
        guidanceType: "etiquette",
        categories: ["market", "restaurant"],
        cities: ["kyoto"],
        tags: ["nishiki market", "shopping", "food"],
        priority: 7,
      });
      const kyotoRestaurant: GuidanceMatchCriteria = {
        category: "restaurant",
        city: "kyoto",
        region: "kansai",
        locationName: "Some Kyoto Ramen Shop",
        tags: ["restaurant"],
        season: "spring",
        month: 4,
      };
      expect(calculateMatchScore(nishikiTip, kyotoRestaurant)).toBe(0);
    });
  });
});
