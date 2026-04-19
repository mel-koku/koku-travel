import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Beat } from "@/components/features/itinerary/chapter/Beat";
import type { Location } from "@/types/location";

const loc = (overrides: Partial<Location> = {}): Location =>
  ({
    id: "a",
    name: "Fushimi Inari",
    category: "temple",
    estimatedDuration: 120,
    ...overrides,
  }) as unknown as Location;

describe("Beat", () => {
  it("renders time, place name, category, duration, and body", () => {
    render(
      <Beat
        time="08:00"
        partOfDay="Morning"
        location={loc()}
        body="Beat the crowd."
        isPast={false}
        chips={[]}
        onExpand={() => {}}
      />,
    );
    expect(screen.getByText("08:00 · Morning")).toBeInTheDocument();
    expect(screen.getByText("Fushimi Inari")).toBeInTheDocument();
    expect(screen.getByText(/temple/i)).toBeInTheDocument();
    expect(screen.getByText(/2h/)).toBeInTheDocument();
    expect(screen.getByText("Beat the crowd.")).toBeInTheDocument();
  });

  it("never renders PracticalBadges at the beat default level", () => {
    const { container } = render(
      <Beat
        time="08:00"
        partOfDay="Morning"
        location={loc({ cashOnly: true, reservationInfo: "required" } as unknown as Location)}
        body="."
        isPast={false}
        chips={[]}
        onExpand={() => {}}
      />,
    );
    expect(container.querySelector("[data-practical-badges]")).toBeNull();
  });

  it("renders provided chips only", () => {
    render(
      <Beat
        time="08:00"
        partOfDay="Morning"
        location={loc()}
        body="."
        isPast={false}
        chips={[{ id: "cash-only", label: "Cash preferred", tone: "warn" }]}
        onExpand={() => {}}
      />,
    );
    expect(screen.getByText("Cash preferred")).toBeInTheDocument();
  });

  it("marks itself as past when isPast is true", () => {
    const { container } = render(
      <Beat
        time="08:00"
        partOfDay="Morning"
        location={loc()}
        body="."
        isPast={true}
        chips={[]}
        onExpand={() => {}}
      />,
    );
    expect(container.querySelector("[data-beat-state='past']")).toBeTruthy();
  });

  it("marks itself as current when isCurrent is true", () => {
    const { container } = render(
      <Beat
        time="08:00"
        partOfDay="Morning"
        location={loc()}
        body="."
        isPast={false}
        isCurrent={true}
        chips={[]}
        onExpand={() => {}}
      />,
    );
    expect(container.querySelector("[data-beat-state='current']")).toBeTruthy();
  });

  it("calls onExpand when the more link is clicked", () => {
    const onExpand = vi.fn();
    render(
      <Beat
        time="08:00"
        partOfDay="Morning"
        location={loc()}
        body="."
        isPast={false}
        chips={[]}
        onExpand={onExpand}
        hasMore
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    expect(onExpand).toHaveBeenCalled();
  });
});
