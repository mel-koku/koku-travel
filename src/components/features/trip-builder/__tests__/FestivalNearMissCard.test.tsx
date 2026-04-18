import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FestivalNearMissCard } from "../FestivalNearMissCard";
import { TripBuilderProvider } from "@/context/TripBuilderContext";
import type { TripBuilderData } from "@/types/trip";

function renderWithContext(initial: Partial<TripBuilderData>) {
  return render(
    <TripBuilderProvider initialData={initial as TripBuilderData}>
      <FestivalNearMissCard />
    </TripBuilderProvider>
  );
}

describe("FestivalNearMissCard", () => {
  beforeEach(() => {
    // Provider hydrates from localStorage on mount; clear between tests so
    // earlier tests' debounced writes don't bleed into later ones.
    window.localStorage.clear();
  });

  it("renders nothing when no near-miss exists for the trip", () => {
    const { container } = renderWithContext({
      cities: ["tokyo"],
      regions: ["kanto"],
      dates: { start: "2026-09-01", end: "2026-09-07" },
      duration: 7,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders action variant for fixed-date forward miss within cap", () => {
    renderWithContext({
      cities: ["osaka"],
      regions: ["kansai"],
      dates: { start: "2026-07-18", end: "2026-07-22" },
      duration: 5,
    });
    expect(screen.getByText(/Tenjin Matsuri starts right after/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Extend trip by 2 days/ })).toBeInTheDocument();
  });

  it("renders info variant (no extend button) for backward miss", () => {
    renderWithContext({
      cities: ["kyoto"],
      regions: ["kansai"],
      dates: { start: "2026-05-17", end: "2026-05-22" },
      duration: 6,
    });
    expect(screen.getByText(/Aoi Matsuri wraps just before/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Extend trip/ })).not.toBeInTheDocument();
  });

  it("clicking extend button shows confirmation with new end date", () => {
    renderWithContext({
      cities: ["osaka"],
      regions: ["kansai"],
      dates: { start: "2026-07-18", end: "2026-07-22" },
      duration: 5,
    });
    fireEvent.click(screen.getByRole("button", { name: /Extend trip by 2 days/ }));
    expect(screen.getByRole("status")).toHaveTextContent(/Trip extended through Friday, July 24/);
    expect(screen.getByRole("status")).toHaveTextContent(/Tenjin Matsuri/);
    expect(screen.getByRole("button", { name: /Undo trip extension/ })).toBeInTheDocument();
  });

  it("clicking undo restores original dates and re-shows the original card", () => {
    renderWithContext({
      cities: ["osaka"],
      regions: ["kansai"],
      dates: { start: "2026-07-18", end: "2026-07-22" },
      duration: 5,
    });
    fireEvent.click(screen.getByRole("button", { name: /Extend trip by 2 days/ }));
    fireEvent.click(screen.getByRole("button", { name: /Undo trip extension/ }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Extend trip by 2 days/ })).toBeInTheDocument();
  });

  it("dismiss button hides the card", () => {
    renderWithContext({
      cities: ["osaka"],
      regions: ["kansai"],
      dates: { start: "2026-07-18", end: "2026-07-22" },
      duration: 5,
    });
    fireEvent.click(screen.getByRole("button", { name: /Dismiss festival suggestion/ }));
    expect(screen.queryByText(/Tenjin Matsuri starts right after/)).not.toBeInTheDocument();
  });
});
