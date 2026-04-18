import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EarthquakeBanner } from "../EarthquakeBanner";
import type { EarthquakeAlert } from "@/lib/alerts/usgs";

const ALERT: EarthquakeAlert = {
  id: "us1000abcd",
  magnitude: 5.8,
  nearestCity: "Tokyo",
  distanceKm: 95,
  occurredAt: new Date().toISOString(),
  relativeTime: "about 6 hours ago",
};

describe("<EarthquakeBanner>", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders heading, body, icon, and region-specific CTA", () => {
    render(<EarthquakeBanner alert={ALERT} region="kanto" tripId="trip-1" />);

    expect(screen.getByRole("heading").textContent).toContain("Magnitude 5.8");
    expect(screen.getByRole("heading").textContent).toContain("Tokyo");

    const body = screen.getByTestId("earthquake-banner-body");
    expect(body.textContent).toContain("95 km");
    expect(body.textContent).toContain("about 6 hours ago");

    expect(screen.getByText("⚠️")).toBeDefined();

    const cta = screen.getByRole("link", { name: /JR East status/i }) as HTMLAnchorElement;
    expect(cta.href).toBe("https://traininfo.jreast.co.jp/service_cloud/en/");
    expect(cta.target).toBe("_blank");
    expect(cta.rel).toContain("noopener");
    expect(cta.rel).toContain("noreferrer");
  });

  it("dismisses and hides on click", () => {
    const { rerender } = render(<EarthquakeBanner alert={ALERT} region="kanto" tripId="trip-1" />);
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
    rerender(<EarthquakeBanner alert={ALERT} region="kanto" tripId="trip-1" />);
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
