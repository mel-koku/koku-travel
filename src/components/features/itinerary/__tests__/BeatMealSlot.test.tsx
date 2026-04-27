import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BeatMealSlot } from "../chapter/BeatMealSlot";

describe("BeatMealSlot", () => {
  it("renders breakfast with contextual eyebrow, label, Add a spot, and dismiss", () => {
    render(
      <BeatMealSlot
        mealType="breakfast"
        onAddSpot={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("Before your first stop")).toBeInTheDocument();
    expect(screen.getByText(/Breakfast/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add a spot/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Dismiss Breakfast suggestion/i }),
    ).toBeInTheDocument();
  });

  it("renders lunch and dinner with neutral position context, no clock time", () => {
    const { rerender } = render(
      <BeatMealSlot mealType="lunch" onAddSpot={() => {}} onDismiss={() => {}} />,
    );
    expect(screen.getByText("Midday break")).toBeInTheDocument();
    expect(screen.getByText(/Lunch break/)).toBeInTheDocument();
    expect(screen.queryByText("12:30")).not.toBeInTheDocument();
    rerender(<BeatMealSlot mealType="dinner" onAddSpot={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("After your last stop")).toBeInTheDocument();
    expect(screen.getByText(/Dinner/)).toBeInTheDocument();
    expect(screen.queryByText("19:00")).not.toBeInTheDocument();
  });

  it("invokes the right callback per button", async () => {
    const user = userEvent.setup();
    const onAddSpot = vi.fn();
    const onDismiss = vi.fn();
    render(
      <BeatMealSlot mealType="lunch" onAddSpot={onAddSpot} onDismiss={onDismiss} />,
    );
    await user.click(screen.getByRole("button", { name: /Add a spot/i }));
    await user.click(screen.getByRole("button", { name: /Dismiss Lunch break suggestion/i }));
    expect(onAddSpot).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("carries data attributes the spine selectors can hook into", () => {
    const { container } = render(
      <BeatMealSlot mealType="lunch" onAddSpot={() => {}} onDismiss={() => {}} />,
    );
    const li = container.querySelector("li");
    expect(li?.getAttribute("data-beat")).toBe("meal-slot");
    expect(li?.getAttribute("data-meal-type")).toBe("lunch");
  });
});
