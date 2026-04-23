import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SlideDrawer } from "@/components/features/itinerary/chapter/SlideDrawer";

describe("SlideDrawer", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <SlideDrawer open={false} onClose={vi.fn()} title="Test drawer">
        <p>Content</p>
      </SlideDrawer>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title and content when open", () => {
    render(
      <SlideDrawer open={true} onClose={vi.fn()} title="Trip overview">
        <p>Dashboard content</p>
      </SlideDrawer>,
    );
    expect(screen.getByRole("dialog", { name: "Trip overview" })).toBeInTheDocument();
    expect(screen.getByText("Trip overview")).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <SlideDrawer open={true} onClose={onClose} title="Before you land">
        <p>Content</p>
      </SlideDrawer>,
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
