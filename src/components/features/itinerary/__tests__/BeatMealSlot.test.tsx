import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BeatMealSlot } from "../chapter/BeatMealSlot";

describe("BeatMealSlot", () => {
  it("renders breakfast with time, label, Add a spot, and dismiss", () => {
    render(
      <BeatMealSlot
        mealType="breakfast"
        onAddSpot={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText(/Breakfast/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add a spot/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Dismiss Breakfast suggestion/i }),
    ).toBeInTheDocument();
  });

  it("renders lunch and dinner with their canonical times", () => {
    const { rerender } = render(
      <BeatMealSlot mealType="lunch" onAddSpot={() => {}} onDismiss={() => {}} />,
    );
    expect(screen.getByText("12:30")).toBeInTheDocument();
    expect(screen.getByText(/Lunch break/)).toBeInTheDocument();
    rerender(<BeatMealSlot mealType="dinner" onAddSpot={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("19:00")).toBeInTheDocument();
    expect(screen.getByText(/Dinner/)).toBeInTheDocument();
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
