import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomActivityCard } from "@/components/features/itinerary/CustomActivityCard";
import type { ItineraryActivity } from "@/types/itinerary";

function makeActivity(overrides: Partial<Extract<ItineraryActivity, { kind: "place" }>> = {}) {
  return {
    kind: "place" as const,
    id: "c-1",
    title: "Grandma's Ramen",
    timeOfDay: "afternoon" as const,
    durationMin: 60,
    isCustom: true,
    ...overrides,
  };
}

describe("CustomActivityCard", () => {
  it("renders title, duration, and 'Custom' chip", () => {
    render(
      <CustomActivityCard activity={makeActivity()} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("Grandma's Ramen")).toBeInTheDocument();
    expect(screen.getByText(/Custom/i)).toBeInTheDocument();
    expect(screen.getByText(/60.*min|1h/i)).toBeInTheDocument();
  });

  it("shows 'No address' hint when coordinates absent", () => {
    render(
      <CustomActivityCard
        activity={makeActivity()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/No address/i)).toBeInTheDocument();
  });

  it("does not show 'No address' when coordinates present", () => {
    render(
      <CustomActivityCard
        activity={makeActivity({ coordinates: { lat: 1, lng: 2 }, address: "1-1 Shibuya" })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText(/No address/i)).not.toBeInTheDocument();
    expect(screen.getByText("1-1 Shibuya")).toBeInTheDocument();
  });

  it("shows up to 3 icons in priority order: phone, website, cost", () => {
    render(
      <CustomActivityCard
        activity={makeActivity({
          phone: "+81-1-1234",
          website: "https://x.com",
          costEstimate: { amount: 1500, currency: "JPY" },
          confirmationNumber: "ABC-123",
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cost/i)).toBeInTheDocument();
    // Confirmation # isn't in the collapsed icon row
    expect(screen.getByText(/\+1/)).toBeInTheDocument(); // "+1" overflow indicator
  });

  it("expands on tap to show full notes and Edit/Delete buttons", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <CustomActivityCard
        activity={makeActivity({ notes: "Long note text here" })}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByText("Grandma's Ramen"));
    expect(screen.getByText("Long note text here")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Edit/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /Delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
