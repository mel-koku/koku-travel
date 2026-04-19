import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Spine } from "@/components/features/itinerary/chapter/Spine";

describe("Spine", () => {
  it("wraps children and renders a single vertical rail container", () => {
    const { container } = render(
      <Spine>
        <div>beat 1</div>
        <div>beat 2</div>
      </Spine>,
    );
    expect(container.querySelector(".spine-rail")).toBeTruthy();
    expect(container.textContent).toContain("beat 1");
    expect(container.textContent).toContain("beat 2");
  });
});
