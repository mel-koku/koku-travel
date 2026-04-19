import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InlineDayNote } from "@/components/features/itinerary/chapter/InlineDayNote";

describe("InlineDayNote", () => {
  it("renders a single closure advisory", () => {
    render(
      <InlineDayNote
        notes={[{ kind: "closure", label: "Closure on this date" }]}
        onReview={() => {}}
      />,
    );
    expect(screen.getByText(/Closure on this date/)).toBeInTheDocument();
  });

  it("collapses multiple notes into a single summary line", () => {
    render(
      <InlineDayNote
        notes={[
          { kind: "closure", label: "Closure A" },
          { kind: "closure", label: "Closure B" },
        ]}
        onReview={() => {}}
      />,
    );
    expect(screen.getByText(/2 advisories for today/i)).toBeInTheDocument();
  });

  it("renders nothing when notes is empty", () => {
    const { container } = render(<InlineDayNote notes={[]} onReview={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
