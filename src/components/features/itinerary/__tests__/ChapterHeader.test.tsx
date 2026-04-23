import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChapterHeader } from "@/components/features/itinerary/chapter/ChapterHeader";

describe("ChapterHeader", () => {
  it("renders city and date, never a numeric day eyebrow or 'Chapter'", () => {
    render(
      <ChapterHeader
        dayIndex={2}
        city="Kyoto"
        date="Thursday, April 23"
        intro="A quiet morning of temples."
      />,
    );
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Thursday, April 23")).toBeInTheDocument();
    expect(screen.queryByText(/DAY\s+\d/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chapter/i)).not.toBeInTheDocument();
  });

  it("renders city name and date", () => {
    render(
      <ChapterHeader
        dayIndex={0}
        city="Tokyo"
        date="Mon, Apr 21"
        intro="Arrival."
      />,
    );
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Mon, Apr 21")).toBeInTheDocument();
  });

  it("applies the chapter-prose class so drop cap styling can attach", () => {
    const { container } = render(
      <ChapterHeader
        dayIndex={0}
        city="Tokyo"
        date="Mon, Apr 21"
        intro="Arrival evening in Shibuya."
      />,
    );
    expect(container.querySelector(".chapter-prose")).toBeTruthy();
  });

  it("does not render the prose paragraph when intro is empty", () => {
    const { container } = render(
      <ChapterHeader dayIndex={0} city="Tokyo" date="Mon, Apr 21" intro="" />,
    );
    expect(container.querySelector(".chapter-prose")).toBeNull();
  });

});
