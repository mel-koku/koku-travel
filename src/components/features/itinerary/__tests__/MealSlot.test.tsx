import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MealSlot } from "../MealSlot";

describe("MealSlot", () => {
  it("renders breakfast with Konbini, Add a spot, and dismiss", () => {
    const onAddSpot = vi.fn();
    const onKonbini = vi.fn();
    const onDismiss = vi.fn();
    render(
      <MealSlot
        mealType="breakfast"
        onAddSpot={onAddSpot}
        onKonbini={onKonbini}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText(/Breakfast/i)).toBeInTheDocument();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Konbini/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add a spot/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Dismiss Breakfast suggestion/i }),
    ).toBeInTheDocument();
  });

  it("hides Konbini on dinner (off-brand)", () => {
    render(
      <MealSlot
        mealType="dinner"
        onAddSpot={() => {}}
        onKonbini={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Konbini/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add a spot/i })).toBeInTheDocument();
  });

  it("hides Konbini when callback omitted (e.g., parent has no handler)", () => {
    render(<MealSlot mealType="lunch" onAddSpot={() => {}} onDismiss={() => {}} />);
    expect(screen.queryByRole("button", { name: /Konbini/i })).not.toBeInTheDocument();
  });

  it("invokes the right callback per button", async () => {
    const user = userEvent.setup();
    const onAddSpot = vi.fn();
    const onKonbini = vi.fn();
    const onDismiss = vi.fn();
    render(
      <MealSlot
        mealType="lunch"
        onAddSpot={onAddSpot}
        onKonbini={onKonbini}
        onDismiss={onDismiss}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Konbini/i }));
    await user.click(screen.getByRole("button", { name: /Add a spot/i }));
    await user.click(screen.getByRole("button", { name: /Dismiss Lunch break suggestion/i }));
    expect(onKonbini).toHaveBeenCalledTimes(1);
    expect(onAddSpot).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses canonical time stamps per meal", () => {
    const { rerender } = render(
      <MealSlot mealType="breakfast" onAddSpot={() => {}} onDismiss={() => {}} />,
    );
    expect(screen.getByText("08:00")).toBeInTheDocument();
    rerender(<MealSlot mealType="lunch" onAddSpot={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("12:30")).toBeInTheDocument();
    rerender(<MealSlot mealType="dinner" onAddSpot={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("19:00")).toBeInTheDocument();
  });
});
