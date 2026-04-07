import { DATABASE_CATEGORY_TO_PARENT } from "@/data/categoryHierarchy";
import {
  COLOR_SCHEME_KEYS,
  HEX_COLOR_KEYS,
} from "@/lib/itinerary/activityColors";

describe("activityColors", () => {
  const categories = Object.keys(DATABASE_CATEGORY_TO_PARENT);

  it("should have a color scheme entry for every database category", () => {
    for (const category of categories) {
      expect(
        COLOR_SCHEME_KEYS.has(category),
        `"${category}" missing from COLOR_SCHEMES`
      ).toBe(true);
    }
  });

  it("should have a hex color entry for every database category", () => {
    for (const category of categories) {
      expect(
        HEX_COLOR_KEYS.has(category),
        `"${category}" missing from HEX_COLORS`
      ).toBe(true);
    }
  });
});
