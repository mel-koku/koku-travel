import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BeatTransit } from "@/components/features/itinerary/chapter/BeatTransit";

describe("BeatTransit", () => {
  it("renders minutes and line when provided", () => {
    render(<BeatTransit minutes={8} mode="train" line="JR Yamanote Line" />);
    expect(screen.getByText(/8 min/)).toBeInTheDocument();
    expect(screen.getByText(/JR Yamanote Line/)).toBeInTheDocument();
  });

  it("renders station pair when summary includes stops", () => {
    render(
      <BeatTransit
        minutes={8}
        mode="train"
        summary={{
          departureStop: "Shibuya",
          arrivalStop: "Harajuku",
          lineShortName: "Yamanote",
          lineColor: "#9ACD32",
        }}
      />,
    );
    expect(screen.getByText(/Shibuya/)).toBeInTheDocument();
    expect(screen.getByText(/Harajuku/)).toBeInTheDocument();
  });

  it("shows Details affordance and expands when clicked", () => {
    render(
      <BeatTransit
        minutes={18}
        mode="transit"
        steps={[
          { type: "walk", walkMinutes: 3, walkInstruction: "Walk to Shibuya Station" },
          {
            type: "transit",
            departureStop: "Shibuya",
            arrivalStop: "Tokyo",
            lineName: "JR Yamanote",
            numStops: 6,
            durationMinutes: 12,
          },
        ]}
        totalFareYen={210}
      />,
    );
    expect(screen.getByText(/Details/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Details/i));
    expect(screen.getByText(/Walk to Shibuya Station/)).toBeInTheDocument();
    expect(screen.getByText(/¥210/)).toBeInTheDocument();
  });

  it("falls back to mode label when no line or summary provided", () => {
    render(<BeatTransit minutes={5} mode="walk" />);
    expect(screen.getByText(/5 min walk/i)).toBeInTheDocument();
  });

  it("does not show Details affordance with a single step and no fare", () => {
    render(
      <BeatTransit
        minutes={12}
        mode="train"
        steps={[
          {
            type: "transit",
            departureStop: "Kyoto",
            arrivalStop: "Osaka",
            lineName: "Shinkansen",
            durationMinutes: 15,
          },
        ]}
      />,
    );
    expect(screen.queryByText(/Details/i)).not.toBeInTheDocument();
  });

  it("shows Details when only totalFareYen is present (even with 1 step)", () => {
    render(
      <BeatTransit
        minutes={15}
        mode="train"
        steps={[
          { type: "transit", departureStop: "Kyoto", arrivalStop: "Osaka", lineName: "Shinkansen" },
        ]}
        totalFareYen={1080}
      />,
    );
    expect(screen.getByText(/Details/i)).toBeInTheDocument();
  });

  it("renders lineShortName over lineName in collapsed summary", () => {
    render(
      <BeatTransit
        minutes={10}
        mode="train"
        summary={{
          departureStop: "Shinjuku",
          arrivalStop: "Harajuku",
          lineName: "JR Yamanote Line",
          lineShortName: "Yamanote",
        }}
      />,
    );
    expect(screen.getByText(/Yamanote/)).toBeInTheDocument();
    // Full name should NOT appear in collapsed view when short name is present
    expect(screen.queryByText("JR Yamanote Line")).not.toBeInTheDocument();
  });

  it("renders (est.) marker when isEstimated is true", () => {
    render(<BeatTransit minutes={55} mode="train" isEstimated />);
    expect(screen.getByText(/est\./i)).toBeInTheDocument();
  });

  it("does not render (est.) marker when isEstimated is false or undefined", () => {
    render(<BeatTransit minutes={55} mode="train" />);
    expect(screen.queryByText(/est\./i)).not.toBeInTheDocument();
  });

  it("renders Open in Maps link when origin and destination coords provided", () => {
    render(
      <BeatTransit
        minutes={18}
        mode="train"
        origin={{ lat: 35.66, lng: 139.70, name: "Shibuya Station" }}
        destination={{ lat: 35.68, lng: 139.77, name: "Tokyo Station" }}
      />,
    );
    expect(screen.getByRole("button", { name: /open in maps/i })).toBeInTheDocument();
  });

  it("does not render Open in Maps link when coords are missing", () => {
    render(<BeatTransit minutes={18} mode="train" />);
    expect(screen.queryByRole("button", { name: /open in maps/i })).not.toBeInTheDocument();
  });

  it("collapses back when Details button is clicked again", () => {
    render(
      <BeatTransit
        minutes={18}
        mode="transit"
        steps={[
          { type: "walk", walkMinutes: 3, walkInstruction: "Walk to Shibuya Station" },
          { type: "transit", departureStop: "Shibuya", arrivalStop: "Tokyo", lineName: "JR Yamanote" },
        ]}
        totalFareYen={210}
      />,
    );
    const btn = screen.getByText(/Details/i);
    fireEvent.click(btn);
    expect(screen.getByText(/Walk to Shibuya Station/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Details/i));
    expect(screen.queryByText(/Walk to Shibuya Station/)).not.toBeInTheDocument();
  });
});
