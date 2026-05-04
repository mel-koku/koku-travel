import { describe, it, expect } from "vitest";
import { resolveSpotlightCopy } from "../seasonalSpotlightCopy";
import { SEASONAL_HIGHLIGHTS } from "@/lib/utils/seasonUtils";
import type { LandingPageContent } from "@/types/sanitySiteContent";

const lateBloom = SEASONAL_HIGHLIGHTS.find((h) => h.id === "cherry-blossom-late")!;
const peakSakura = SEASONAL_HIGHLIGHTS.find((h) => h.id === "cherry-blossom")!;

describe("resolveSpotlightCopy", () => {
  it("uses highlight copy when an active highlight has regions", () => {
    const copy = resolveSpotlightCopy(lateBloom, "spring");
    expect(copy.heading).toBe("Late-Blooming Sakura");
    expect(copy.description).toBe("Late-blooming sakura in Tohoku and Hokkaido");
    expect(copy.ctaText).toBe("See late-blooming sakura");
  });

  it("uses highlight copy when an active highlight has no regions", () => {
    const copy = resolveSpotlightCopy(peakSakura, "spring");
    expect(copy.heading).toBe("Cherry Blossom Season");
    expect(copy.description).toBe("Sakura is at peak across Honshu");
    expect(copy.ctaText).toBe("See sakura at peak");
  });

  it("highlight copy ignores Sanity per-season override (highlight wins)", () => {
    const content: LandingPageContent = {
      seasonalSpotlightSpringHeading: "Editor override",
      seasonalSpotlightDescription: "Editor description",
    };
    const copy = resolveSpotlightCopy(lateBloom, "spring", content);
    expect(copy.heading).toBe("Late-Blooming Sakura");
    expect(copy.description).toBe("Late-blooming sakura in Tohoku and Hokkaido");
  });

  it("highlight CTA falls back to Sanity ctaText when highlight id is unknown", () => {
    const phantomHighlight = { ...peakSakura, id: "unknown-id" };
    const content: LandingPageContent = {
      seasonalSpotlightCtaText: "Editor CTA",
    };
    const copy = resolveSpotlightCopy(phantomHighlight, "spring", content);
    expect(copy.ctaText).toBe("Editor CTA");
  });

  it("falls back to Sanity per-season heading when no highlight is active", () => {
    const content: LandingPageContent = {
      seasonalSpotlightSpringHeading: "Editor spring heading",
      seasonalSpotlightDescription: "Editor description",
      seasonalSpotlightCtaText: "Editor CTA",
    };
    const copy = resolveSpotlightCopy(null, "spring", content);
    expect(copy.heading).toBe("Editor spring heading");
    expect(copy.description).toBe("Editor description");
    expect(copy.ctaText).toBe("Editor CTA");
  });

  it("falls back to static map when no highlight and no Sanity content", () => {
    const copy = resolveSpotlightCopy(null, "summer");
    expect(copy.heading).toBe("Festivals, fireworks, and cool escapes");
    expect(copy.description).toBe("Places and guides at their best right now.");
    expect(copy.ctaText).toBe("See all seasonal picks");
  });

  it("maps fall season to the Sanity Autumn field", () => {
    const content: LandingPageContent = {
      seasonalSpotlightAutumnHeading: "Editor autumn heading",
    };
    const copy = resolveSpotlightCopy(null, "fall", content);
    expect(copy.heading).toBe("Editor autumn heading");
  });

  it("falls back to static heading when fall has no Autumn override", () => {
    const copy = resolveSpotlightCopy(null, "fall");
    expect(copy.heading).toBe("Koyo colors at their peak");
  });
});
