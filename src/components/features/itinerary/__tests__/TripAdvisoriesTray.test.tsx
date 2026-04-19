import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TripAdvisoriesTray } from "@/components/features/itinerary/chapter/TripAdvisoriesTray";

const entries = [
  { key: "prep-checklist", title: "Pack for 14°C mornings", body: "3 days before departure." },
  { key: "goshuin", title: "Goshuin passport", body: "One-time read." },
];

describe("TripAdvisoriesTray", () => {
  beforeEach(() => localStorage.clear());

  it("renders the expected number of active entries", () => {
    render(
      <TripAdvisoriesTray
        tripId="trip-1"
        entries={entries}
        dismissed={new Set()}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getAllByRole("button", { name: /got it/i })).toHaveLength(2);
  });

  it("hides dismissed entries from the active list", () => {
    render(
      <TripAdvisoriesTray
        tripId="trip-1"
        entries={entries}
        dismissed={new Set(["prep-checklist"])}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getAllByRole("button", { name: /got it/i })).toHaveLength(1);
    expect(screen.queryByText(/Pack for 14°C mornings/)).not.toBeInTheDocument();
  });

  it("fires onDismiss with the advisory key when Got it clicked", () => {
    const onDismiss = vi.fn();
    render(
      <TripAdvisoriesTray
        tripId="trip-1"
        entries={entries}
        dismissed={new Set()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /got it/i })[0]);
    expect(onDismiss).toHaveBeenCalledWith("prep-checklist");
  });

  it("renders an empty state when all entries are dismissed", () => {
    render(
      <TripAdvisoriesTray
        tripId="trip-1"
        entries={entries}
        dismissed={new Set(["prep-checklist", "goshuin"])}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText(/No advisories right now/i)).toBeInTheDocument();
  });
});
