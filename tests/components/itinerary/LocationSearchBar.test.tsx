import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LocationSearchBar } from "@/components/features/itinerary/LocationSearchBar";

vi.mock("@/hooks/useLocationSearch", () => ({
  useLocationSearch: () => ({
    data: undefined,
    isLoading: false,
    isNotFound: false,
    isDebouncing: false,
  }),
}));

describe("LocationSearchBar", () => {
  it("renders collapsed by default (shows 'Add a place' button, not the input)", () => {
    render(<LocationSearchBar dayActivities={[]} onAddActivity={() => {}} />);
    expect(screen.getByRole("button", { name: /add a place/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search locations/i)).not.toBeInTheDocument();
  });

  it("renders expanded immediately when defaultExpanded is true", () => {
    render(
      <LocationSearchBar dayActivities={[]} onAddActivity={() => {}} defaultExpanded />,
    );
    expect(screen.getByPlaceholderText(/search locations/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^add a place$/i })).not.toBeInTheDocument();
  });

  it("hides the internal close-X button when defaultExpanded is true", () => {
    render(
      <LocationSearchBar dayActivities={[]} onAddActivity={() => {}} defaultExpanded />,
    );
    expect(screen.queryByRole("button", { name: /close search/i })).not.toBeInTheDocument();
  });

  it("shows the close-X when defaultExpanded is false and the user expands", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<LocationSearchBar dayActivities={[]} onAddActivity={() => {}} />);
    await user.click(screen.getByRole("button", { name: /add a place/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /close search/i })).toBeInTheDocument();
    });
  });
});
