import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BeforeYouLandDrawer } from "@/components/features/itinerary/chapter/BeforeYouLandDrawer";

describe("BeforeYouLandDrawer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <BeforeYouLandDrawer open={false} onClose={vi.fn()} briefing={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the fallback when briefing is missing", () => {
    render(<BeforeYouLandDrawer open={true} onClose={vi.fn()} briefing={null} />);
    expect(screen.getByText(/haven't prepared a cultural briefing/i)).toBeInTheDocument();
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(<BeforeYouLandDrawer open={true} onClose={onClose} briefing={null} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
