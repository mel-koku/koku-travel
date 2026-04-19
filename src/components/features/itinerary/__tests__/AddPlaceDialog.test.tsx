import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddPlaceDialog } from "@/components/features/itinerary/chapter/AddPlaceDialog";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const mockDays = [
  { index: 0, label: "Day 1 · Tokyo", activities: [] },
  { index: 1, label: "Day 2 · Kyoto", activities: [] },
];

describe("AddPlaceDialog", () => {
  it("renders when open is true", () => {
    render(
      <AddPlaceDialog
        open={true}
        onClose={() => {}}
        days={mockDays}
        defaultDayIndex={0}
        onAdd={() => {}}
      />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByRole("dialog", { name: "Add a place" })).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <AddPlaceDialog
        open={false}
        onClose={() => {}}
        days={mockDays}
        defaultDayIndex={0}
        onAdd={() => {}}
      />,
      { wrapper: makeWrapper() },
    );
    expect(screen.queryByRole("dialog", { name: "Add a place" })).not.toBeInTheDocument();
  });

  it("calls onClose when the Close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <AddPlaceDialog
        open={true}
        onClose={onClose}
        days={mockDays}
        defaultDayIndex={0}
        onAdd={() => {}}
      />,
      { wrapper: makeWrapper() },
    );
    await userEvent.click(screen.getByText("Close ✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders day selector with all days", () => {
    render(
      <AddPlaceDialog
        open={true}
        onClose={() => {}}
        days={mockDays}
        defaultDayIndex={0}
        onAdd={() => {}}
      />,
      { wrapper: makeWrapper() },
    );
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Day 1 · Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Day 2 · Kyoto")).toBeInTheDocument();
  });
});
