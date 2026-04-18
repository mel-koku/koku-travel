import { describe, it, expect } from "vitest";
import { CULTURAL_MOMENT_TEMPLATES } from "../culturalMoments";
import { REGIONS } from "@/data/regions";
import { CULTURAL_SUBCATEGORIES } from "@/lib/guide/guideBuilder";

const VALID_REGION_IDS = new Set(REGIONS.map((r) => r.id));

// Production triggering set plus the "any" wildcard used in fallback keys.
const TRIGGERING_SUBCATEGORIES = new Set<string>([
  ...CULTURAL_SUBCATEGORIES,
  "any",
]);

describe("CULTURAL_MOMENT_TEMPLATES — data integrity", () => {
  it("has unique IDs across all templates", () => {
    const ids = CULTURAL_MOMENT_TEMPLATES.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("has non-empty content for every template", () => {
    for (const t of CULTURAL_MOMENT_TEMPLATES) {
      expect(t.content.trim().length, `template ${t.id}`).toBeGreaterThan(0);
    }
  });

  it("keys follow the {sub}:{target} format", () => {
    for (const t of CULTURAL_MOMENT_TEMPLATES) {
      expect(t.key, `template ${t.id}`).toMatch(/^[a-z-]+:[a-z-]+$/);
    }
  });

  it("keys use recognized subcategories", () => {
    for (const t of CULTURAL_MOMENT_TEMPLATES) {
      const [sub] = t.key.split(":");
      expect(
        TRIGGERING_SUBCATEGORIES.has(sub!),
        `template ${t.id} has unrecognized subcategory "${sub}"`,
      ).toBe(true);
    }
  });

  it("region-keyed templates reference valid region IDs", () => {
    for (const t of CULTURAL_MOMENT_TEMPLATES) {
      const [, target] = t.key.split(":");
      // Ignore "any" and city-level targets; only validate when target looks like a region
      if (target === "any" || !target) continue;
      // A target that isn't a region is assumed to be a city. We only fail if a
      // region-word-like target (9 canonical regions) doesn't match a known ID.
      const canonicalRegionWords = new Set([
        "kansai",
        "kanto",
        "chubu",
        "kyushu",
        "hokkaido",
        "tohoku",
        "chugoku",
        "shikoku",
        "okinawa",
      ]);
      if (canonicalRegionWords.has(target)) {
        expect(VALID_REGION_IDS.has(target as never), `template ${t.id}`).toBe(true);
      }
    }
  });

  it("new C11 regional templates are present", () => {
    const ids = new Set(CULTURAL_MOMENT_TEMPLATES.map((t) => t.id));
    const c11Ids = [
      "cm-53", "cm-54", "cm-55",             // Nara
      "cm-56", "cm-57", "cm-58", "cm-59", "cm-60", // Kyushu
      "cm-61", "cm-62", "cm-63", "cm-64",    // Hokkaido
      "cm-65", "cm-66", "cm-67",             // Okinawa
      "cm-68", "cm-69", "cm-70",             // Kanazawa / Hiroshima / Nagoya
    ];
    for (const id of c11Ids) {
      expect(ids.has(id), `expected template ${id}`).toBe(true);
    }
  });

  it("no em-dashes in C11+ regional template content (brand voice rule)", () => {
    // cm-53 through cm-71: C11 regional batch + landmark:nara added when
    // landmark was wired into CULTURAL_SUBCATEGORIES.
    const newTemplates = CULTURAL_MOMENT_TEMPLATES.filter((t) => {
      const n = Number(t.id.replace("cm-", ""));
      return n >= 53 && n <= 71;
    });
    for (const t of newTemplates) {
      expect(t.content.includes("—"), `template ${t.id} contains em-dash`).toBe(false);
    }
  });
});
