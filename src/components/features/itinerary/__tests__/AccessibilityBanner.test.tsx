import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccessibilityBanner } from "../AccessibilityBanner";
import type { StoredTrip } from "@/services/trip/types";

const TRIP = { id: "trip-access-1" } as StoredTrip;

describe("<AccessibilityBanner>", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders heading, bullets, icon, and both CTAs", () => {
    render(<AccessibilityBanner trip={TRIP} />);

    expect(screen.getByRole("heading").textContent).toContain(
      "Accessibility in Japan",
    );

    // Icon is aria-hidden, so look for the character directly.
    expect(screen.getByText("♿")).toBeDefined();

    // Five bullets covering the five sourced topics.
    const bullets = screen.getAllByRole("listitem");
    expect(bullets).toHaveLength(5);

    // Spot-check key sourced references survive in copy.
    const body = bullets.map((b) => b.textContent ?? "").join(" ");
    expect(body).toContain("JR East");
    expect(body).toContain("JNTO");
    expect(body).toContain("Fushimi Inari");
    expect(body).toContain("Isetan");
    expect(body).toContain("tabifuku.jp");

    expect(
      screen.getByRole("button", { name: /Accessibility resources/i }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Dismiss/i })).toBeDefined();
  });

  it("opens tabifuku.jp in a new tab with noopener,noreferrer", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    try {
      render(<AccessibilityBanner trip={TRIP} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Accessibility resources/i }),
      );
      expect(openSpy).toHaveBeenCalledWith(
        "https://www.tabifuku.jp/",
        "_blank",
        "noopener,noreferrer",
      );
    } finally {
      openSpy.mockRestore();
    }
  });

  it("dismisses and hides on click, persisting to sessionStorage", () => {
    const { rerender } = render(<AccessibilityBanner trip={TRIP} />);
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
    rerender(<AccessibilityBanner trip={TRIP} />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(window.sessionStorage.getItem("yuku-accessibility-dismissed-trip-access-1")).toBe("1");
  });

  it("stays dismissed across remounts when sessionStorage is set", () => {
    window.sessionStorage.setItem(
      "yuku-accessibility-dismissed-trip-access-1",
      "1",
    );
    render(<AccessibilityBanner trip={TRIP} />);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("contains no em-dashes (brand voice rule)", () => {
    render(<AccessibilityBanner trip={TRIP} />);
    const body = document.body.textContent ?? "";
    expect(body.includes("\u2014")).toBe(false);
  });

  it("sources claims to organizations, not individuals or 'locals'", () => {
    render(<AccessibilityBanner trip={TRIP} />);
    const body = document.body.textContent ?? "";
    // "Locals" as a sourcing claim is banned per brand voice rules. The word
    // "local" can still appear inside phrases like "the local norm" which is
    // a behavioral description, not a sourcing claim. Check the stricter
    // form.
    expect(body.toLowerCase()).not.toContain("locals say");
    expect(body.toLowerCase()).not.toContain("people who live");
  });
});
