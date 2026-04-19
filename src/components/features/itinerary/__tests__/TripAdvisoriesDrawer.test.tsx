import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TripAdvisoriesDrawer } from "@/components/features/itinerary/chapter/TripAdvisoriesDrawer";

const trayProps = {
  tripId: "trip-1",
  entries: [{ key: "prep-checklist", title: "Pre-trip checklist", body: "Check your JR Pass." }],
  dismissed: new Set<string>(),
  onDismiss: vi.fn(),
};

describe("TripAdvisoriesDrawer", () => {
  it("is hidden when open=false", () => {
    render(<TripAdvisoriesDrawer open={false} onClose={() => {}} trayProps={trayProps} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is visible when open=true", () => {
    render(<TripAdvisoriesDrawer open onClose={() => {}} trayProps={trayProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when Close button clicked", () => {
    const onClose = vi.fn();
    render(<TripAdvisoriesDrawer open onClose={onClose} trayProps={trayProps} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
