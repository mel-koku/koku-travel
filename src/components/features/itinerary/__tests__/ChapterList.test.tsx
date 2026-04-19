import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChapterList } from "@/components/features/itinerary/chapter/ChapterList";

const mockTrip = {
  id: "trip-1",
  name: "Two Weeks in Japan",
  days: [
    {
      id: "d0",
      date: "2026-04-21",
      city: "Tokyo",
      intro: "Arrival evening in Shibuya.",
      beats: [
        {
          id: "b0",
          time: "19:00",
          partOfDay: "Evening" as const,
          location: { id: "a", name: "Shibuya Sky", category: "view", estimatedDuration: 90 },
          body: "The city's best skyline, right on arrival.",
          chips: [],
          hasMore: false,
          transitToNext: null,
        },
      ],
      inlineNotes: [],
      isLocked: false,
      dayActivities: [],
    },
    {
      id: "d1",
      date: "2026-04-22",
      city: "Tokyo",
      intro: "Asakusa in the morning.",
      beats: [],
      inlineNotes: [],
      isLocked: false,
      dayActivities: [],
    },
  ],
};

describe("ChapterList", () => {
  it("renders one chapter header per day", () => {
    render(
      <ChapterList
        trip={mockTrip as never}
        onExpandBeat={() => {}}
        onReviewAdvisories={() => {}}
      />,
    );
    expect(screen.getByText("DAY 1")).toBeInTheDocument();
    expect(screen.getByText("DAY 2")).toBeInTheDocument();
  });

  it("renders beats inside their chapter", () => {
    render(
      <ChapterList
        trip={mockTrip as never}
        onExpandBeat={() => {}}
        onReviewAdvisories={() => {}}
      />,
    );
    expect(screen.getByText("Shibuya Sky")).toBeInTheDocument();
  });

  it("renders UnlockBeat instead of beats when day.isLocked is true and unlockProps provided", () => {
    const lockedTrip = {
      ...mockTrip,
      days: [
        mockTrip.days[0],
        {
          ...mockTrip.days[1],
          isLocked: true,
          beats: [],
        },
      ],
    };
    render(
      <ChapterList
        trip={lockedTrip as never}
        onExpandBeat={() => {}}
        onReviewAdvisories={() => {}}
        unlockProps={{
          priceLabel: "$19",
          onUnlock: () => {},
          cities: ["Kyoto", "Osaka"],
          totalDays: 5,
        }}
      />,
    );
    expect(screen.getByTestId ? screen.queryByText("Asakusa in the morning.") : true).toBeTruthy();
    // UnlockBeat renders with data-beat="unlock"
    const unlockEl = document.querySelector("[data-beat='unlock']");
    expect(unlockEl).not.toBeNull();
  });
});
