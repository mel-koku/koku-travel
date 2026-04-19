import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineAddActivity } from "@/components/features/itinerary/chapter/InlineAddActivity";

vi.mock("@/components/features/itinerary/LocationSearchBar", () => ({
  LocationSearchBar: () => <div data-testid="location-search-bar" />,
}));
vi.mock("@/components/features/itinerary/CustomActivityForm", () => ({
  CustomActivityForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="custom-activity-form">
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe("InlineAddActivity", () => {
  it("shows catalog tab by default", () => {
    render(<InlineAddActivity dayActivities={[]} onAdd={() => {}} />);
    expect(screen.getByTestId("location-search-bar")).toBeInTheDocument();
    expect(screen.queryByTestId("custom-activity-form")).toBeNull();
  });

  it("switches to custom tab on click", () => {
    render(<InlineAddActivity dayActivities={[]} onAdd={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /add custom/i }));
    expect(screen.getByTestId("custom-activity-form")).toBeInTheDocument();
    expect(screen.queryByTestId("location-search-bar")).toBeNull();
  });

  it("switches back to catalog on cancel", () => {
    render(<InlineAddActivity dayActivities={[]} onAdd={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /add custom/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByTestId("location-search-bar")).toBeInTheDocument();
  });
});
