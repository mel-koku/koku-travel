import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LaunchNudge } from "@/components/features/itinerary/chapter/LaunchNudge";

describe("LaunchNudge", () => {
  it("renders the moved-advisories copy", () => {
    render(<LaunchNudge onDismiss={() => {}} />);
    expect(screen.getByText(/Trip advisories moved here/i)).toBeInTheDocument();
  });

  it("calls onDismiss when Got it clicked", () => {
    const onDismiss = vi.fn();
    render(<LaunchNudge onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
