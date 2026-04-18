 
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

describe("PracticalBadges: dietary pills", () => {
  it("renders no dietary pill when dietaryFlags is absent and servesVegetarianFood is absent", () => {
    render(
      <PracticalBadges
        location={loc({ cashOnly: true })}
        showOpenStatus={false}
      />,
    );
    expect(screen.queryByText(/Vegetarian|Vegan|Halal|Gluten-free/)).not.toBeInTheDocument();
    expect(screen.getByText("Cash only")).toBeInTheDocument();
  });

  it("renders a single Vegan friendly pill when dietaryFlags=['vegan']", () => {
    render(
      <PracticalBadges
        location={loc({ dietaryFlags: ["vegan"] })}
        showOpenStatus={false}
      />,
    );
    expect(screen.getByText("Vegan friendly")).toBeInTheDocument();
  });

  it("renders two dietary pills in priority order (Halal before Vegan friendly)", () => {
    render(
      <PracticalBadges
        location={loc({ dietaryFlags: ["vegan", "halal"] })}
        showOpenStatus={false}
        max={5}
      />,
    );
    const halal = screen.getByText("Halal");
    const vegan = screen.getByText("Vegan friendly");
    expect(halal).toBeInTheDocument();
    expect(vegan).toBeInTheDocument();
    // Priority: halal appears before vegan in DOM order.
    expect(
      halal.compareDocumentPosition(vegan) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("caps at 2 dietary pills when all four flags are set", () => {
    render(
      <PracticalBadges
        location={loc({
          dietaryFlags: ["halal", "vegan", "gluten_free", "vegetarian"],
        })}
        showOpenStatus={false}
        max={5}
      />,
    );
    expect(screen.getByText("Halal")).toBeInTheDocument();
    expect(screen.getByText("Vegan friendly")).toBeInTheDocument();
    expect(screen.queryByText("Gluten-free")).not.toBeInTheDocument();
    expect(screen.queryByText("Vegetarian friendly")).not.toBeInTheDocument();
  });

  it("does not render a dietary pill on non-food categories (category gate)", () => {
    render(
      <PracticalBadges
        location={loc({ category: "landmark", dietaryFlags: ["vegan"] })}
        showOpenStatus={false}
      />,
    );
    expect(screen.queryByText("Vegan friendly")).not.toBeInTheDocument();
  });

  it("kitchen-sink: payment + 2 dietary + price + station all coexist when max is high enough", () => {
    render(
      <PracticalBadges
        location={loc({
          cashOnly: true,
          dietaryFlags: ["vegan", "gluten_free"],
          priceLevel: 2,
          nearestStation: "Shibuya",
        })}
        showOpenStatus={false}
        max={10}
      />,
    );
    expect(screen.getByText("Cash only")).toBeInTheDocument();
    expect(screen.getByText("Vegan friendly")).toBeInTheDocument();
    expect(screen.getByText("Gluten-free")).toBeInTheDocument();
    expect(screen.getByText("¥¥")).toBeInTheDocument();
    expect(screen.getByText("Shibuya")).toBeInTheDocument();
  });
});
