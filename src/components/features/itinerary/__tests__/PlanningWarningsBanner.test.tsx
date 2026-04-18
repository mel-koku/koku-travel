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
});
