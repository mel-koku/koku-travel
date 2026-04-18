 
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PracticalBadges } from "../PracticalBadges";
import type { Location } from "@/types/location";

function loc(partial: Partial<Location>): Location {
  return {
    id: "test",
    name: "Test",
    region: "kanto",
    city: "tokyo",
    category: "restaurant",
    image: "",
    shortDescription: "",
    coordinates: { latitude: 0, longitude: 0 },
    ...partial,
  } as Location;
}

describe("PracticalBadges: payment pill", () => {
  it("renders legacy Cash only when cashOnly=true and paymentTypes absent", () => {
    render(<PracticalBadges location={loc({ cashOnly: true })} showOpenStatus={false} />);
    expect(screen.getByText("Cash only")).toBeInTheDocument();
  });

  it("renders Cards accepted when paymentTypes includes a major brand", () => {
    render(
      <PracticalBadges
        location={loc({ paymentTypes: ["visa", "jcb"] })}
        showOpenStatus={false}
      />,
    );
    expect(screen.getByText("Cards accepted")).toBeInTheDocument();
    expect(screen.queryByText("Cash only")).not.toBeInTheDocument();
  });

  it("renders IC card pill when only ic_card is present", () => {
    render(
      <PracticalBadges
        location={loc({ paymentTypes: ["ic_card"] })}
        showOpenStatus={false}
      />,
    );
    expect(screen.getByText("IC card")).toBeInTheDocument();
  });

  it("renders nothing when both cashOnly and paymentTypes are absent (no other badges)", () => {
    const { container } = render(
      <PracticalBadges location={loc({})} showOpenStatus={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("respects the max=3 badge budget when payment + reservation + station + price all apply", () => {
    render(
      <PracticalBadges
        location={loc({
          paymentTypes: ["visa"],
          reservationInfo: "required",
          nearestStation: "Shinjuku Station (3 min walk)",
          priceLevel: 3,
        })}
        showOpenStatus={false}
        max={3}
      />,
    );
    // Four badges would render; only three visible.
    const payment = screen.queryByText("Cards accepted");
    const reservation = screen.queryByText("Reservation required");
    const station = screen.queryByText(/Shinjuku Station/);
    const price = screen.queryByText("¥¥¥");
    const visible = [payment, reservation, station, price].filter(Boolean);
    expect(visible).toHaveLength(3);
  });
});
