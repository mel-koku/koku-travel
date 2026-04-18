import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanningWarningsBanner } from "../PlanningWarningsBanner";
import type { PlanningWarning } from "@/lib/planning/tripWarnings";

const HOLIDAY: PlanningWarning = {
  id: "h-1", type: "holiday", severity: "warning",
  title: "Golden Week Travel Period", message: "Expect crowds.", icon: "🎌",
};
const SEASONAL: PlanningWarning = {
  id: "s-1", type: "seasonal_cherry_blossom", severity: "info",
  title: "Cherry Blossom Season", message: "Hanami spots included.", icon: "🌸",
};
const PACING: PlanningWarning = {
  id: "p-1", type: "pacing", severity: "info",
  title: "Active Itinerary", message: "Manageable but limited downtime.", icon: "📍",
};
const DISTANCE: PlanningWarning = {
  id: "d-1", type: "distance", severity: "warning",
  title: "Long Distance Between Regions", message: "Hokkaido and Kyushu are 2,000km apart.", icon: "✈️",
};

describe("PlanningWarningsBanner", () => {
  it("renders nothing when no warnings", () => {
    const { container } = render(<PlanningWarningsBanner warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when only pacing warnings (filtered out)", () => {
    const { container } = render(<PlanningWarningsBanner warnings={[PACING]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders relevant warnings (holiday, seasonal)", () => {
    render(<PlanningWarningsBanner warnings={[HOLIDAY, SEASONAL, PACING]} />);
    // Trigger label should always be visible
    expect(screen.getByText(/Trip context/i)).toBeInTheDocument();
    // Banner is collapsed by default; expand to assert content
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Golden Week/)).toBeInTheDocument();
    expect(screen.getByText(/Cherry Blossom/)).toBeInTheDocument();
    expect(screen.queryByText(/Active Itinerary/)).not.toBeInTheDocument();
  });

  it("shows the count of relevant warnings in the trigger", () => {
    render(<PlanningWarningsBanner warnings={[HOLIDAY, SEASONAL]} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it("handles undefined warnings gracefully (legacy itineraries)", () => {
    const { container } = render(<PlanningWarningsBanner warnings={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("includes distance warnings (Hokkaido + Kyushu needs a flight)", () => {
    render(<PlanningWarningsBanner warnings={[DISTANCE]} />);
    expect(screen.getByText(/Trip context/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Long Distance Between Regions/)).toBeInTheDocument();
  });
});

describe("PlanningWarningsBanner — actionable warnings filter", () => {
  const FESTIVAL_NM_INFO: PlanningWarning = {
    id: "festival-near-miss-aoi-matsuri",
    type: "festival_near_miss",
    severity: "info",
    title: "Aoi Matsuri wraps just before you arrive",
    message: "It ended the day before you arrive.",
    icon: "🎆",
  };

  const FESTIVAL_NM_ACTION: PlanningWarning = {
    id: "festival-near-miss-tenjin-matsuri",
    type: "festival_near_miss",
    severity: "info",
    title: "Tenjin Matsuri starts right after your trip",
    message: "It begins 2 days after your trip ends.",
    icon: "🎆",
    action: "extend_trip",
    actionData: { festivalId: "tenjin-matsuri", extendDays: 2, newEndDate: "2026-07-24" },
  };

  it("renders info-only festival_near_miss in the post-generation banner", () => {
    render(<PlanningWarningsBanner warnings={[FESTIVAL_NM_INFO]} />);
    fireEvent.click(screen.getByRole("button", { name: /Trip context/i }));
    expect(screen.getByText(/Aoi Matsuri wraps just before you arrive/)).toBeInTheDocument();
  });

  it("hides actionable festival_near_miss from the post-generation banner", () => {
    render(<PlanningWarningsBanner warnings={[FESTIVAL_NM_ACTION]} />);
    expect(screen.queryByRole("button", { name: /Trip context/i })).not.toBeInTheDocument();
  });

  it("renders return_to_airport warnings even though they carry an action field", () => {
    const RETURN_TO_AIRPORT: PlanningWarning = {
      id: "return-to-airport",
      type: "return_to_airport",
      severity: "caution",
      title: "Long Trip to Your Departure Airport",
      message: "Your last city is ~3h from your departure airport.",
      icon: "✈️",
      action: "Add return day in Tokyo",
      actionData: { returnCityId: "tokyo", returnCityName: "Tokyo", travelMinutes: 180 },
    };
    render(<PlanningWarningsBanner warnings={[RETURN_TO_AIRPORT]} />);
    fireEvent.click(screen.getByRole("button", { name: /Trip context/i }));
    expect(screen.getByText(/Long Trip to Your Departure Airport/)).toBeInTheDocument();
  });

  it("renders only the info-only festival_near_miss when both info and actionable variants are present", () => {
    // Reuse the FESTIVAL_NM_INFO and FESTIVAL_NM_ACTION fixtures already declared
    // in this describe block.
    render(<PlanningWarningsBanner warnings={[FESTIVAL_NM_INFO, FESTIVAL_NM_ACTION]} />);
    fireEvent.click(screen.getByRole("button", { name: /Trip context/i }));
    expect(screen.getByText(/Aoi Matsuri wraps just before you arrive/)).toBeInTheDocument();
    expect(screen.queryByText(/Tenjin Matsuri starts right after your trip/)).not.toBeInTheDocument();
  });
});
