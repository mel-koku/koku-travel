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
    expect(screen.getAllByText("Tokyo")).toHaveLength(2);
    expect(screen.queryByText(/DAY\s+\d/i)).not.toBeInTheDocument();
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

  it("accepts onReorderBeats without crashing", () => {
    render(
      <ChapterList
        trip={mockTrip as never}
        onExpandBeat={() => {}}
        onReviewAdvisories={() => {}}
        onReorderBeats={() => {}}
      />,
    );
    expect(screen.getAllByText("Tokyo")).toHaveLength(2);
  });

  it("does not render inline add-activity inside chapter sections", () => {
    render(
      <ChapterList
        trip={mockTrip as never}
        onExpandBeat={() => {}}
        onReviewAdvisories={() => {}}
      />,
    );
    // The inline add-activity bar is no longer rendered inside ChapterList
    expect(document.querySelector("[data-inline-add]")).toBeNull();
  });

  describe("start/end anchors (KOK-29)", () => {
    it("renders an arrival-airport start anchor on Day 1 with IATA copy", () => {
      const tripWithAirport = {
        ...mockTrip,
        days: [
          {
            ...mockTrip.days[0],
            startAnchor: {
              point: {
                type: "airport",
                id: "kix",
                name: "Kansai Intl.",
                iataCode: "KIX",
                coordinates: { lat: 34.43, lng: 135.24 },
              },
              isArrivalAirport: true,
            },
          },
          mockTrip.days[1],
        ],
      };
      render(
        <ChapterList
          trip={tripWithAirport as never}
          onExpandBeat={() => {}}
          onReviewAdvisories={() => {}}
        />,
      );
      const anchor = document.querySelector("[data-anchor-role='start']");
      expect(anchor).not.toBeNull();
      expect(anchor?.textContent).toContain("Arrived at Kansai Intl.");
      expect(anchor?.textContent).toContain("KIX");
    });

    it("renders both start and end anchors when lodging is set", () => {
      const accom = {
        type: "accommodation",
        id: "tawaraya",
        name: "Tawaraya Ryokan",
        coordinates: { lat: 35.01, lng: 135.76 },
      };
      const tripWithLodging = {
        ...mockTrip,
        days: [
          {
            ...mockTrip.days[0],
            startAnchor: { point: accom },
            endAnchor: { point: accom },
          },
          mockTrip.days[1],
        ],
      };
      render(
        <ChapterList
          trip={tripWithLodging as never}
          onExpandBeat={() => {}}
          onReviewAdvisories={() => {}}
        />,
      );
      const anchors = document.querySelectorAll("[data-beat='anchor']");
      expect(anchors).toHaveLength(2);
      expect(document.querySelector("[data-anchor-role='start']")?.textContent)
        .toContain("Tawaraya Ryokan");
      expect(document.querySelector("[data-anchor-role='end']")?.textContent)
        .toContain("Tawaraya Ryokan");
    });

    it("renders no anchors when both startAnchor and endAnchor are absent (cleared)", () => {
      render(
        <ChapterList
          trip={mockTrip as never}
          onExpandBeat={() => {}}
          onReviewAdvisories={() => {}}
        />,
      );
      expect(document.querySelector("[data-beat='anchor']")).toBeNull();
    });

    it("does not render anchors on locked days (paywall is the only beat)", () => {
      const lockedTrip = {
        ...mockTrip,
        days: [
          mockTrip.days[0],
          {
            ...mockTrip.days[1],
            isLocked: true,
            beats: [],
            startAnchor: {
              point: {
                type: "accommodation",
                id: "h",
                name: "Hotel Granvia",
                coordinates: { lat: 35.0, lng: 135.7 },
              },
            },
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
            cities: ["Kyoto"],
            totalDays: 2,
          }}
        />,
      );
      // The locked day's anchor should NOT render — UnlockBeat replaces the spine.
      // The first day has no anchor either, so the count must be zero.
      expect(document.querySelector("[data-beat='anchor']")).toBeNull();
    });
  });
});
