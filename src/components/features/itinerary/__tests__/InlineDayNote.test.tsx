import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InlineDayNote } from "@/components/features/itinerary/chapter/InlineDayNote";

describe("InlineDayNote", () => {
  it("renders a single safety advisory", () => {
    render(
      <InlineDayNote
        notes={[{ kind: "safety", label: "Typhoon advisory in effect" }]}
        onReview={() => {}}
      />,
    );
    expect(screen.getByText(/Typhoon advisory/)).toBeInTheDocument();
  });

  it("collapses multiple notes into a single summary line", () => {
    render(
      <InlineDayNote
        notes={[
          { kind: "safety", label: "Typhoon advisory" },
          { kind: "closure", label: "2 stops closed on this date" },
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
