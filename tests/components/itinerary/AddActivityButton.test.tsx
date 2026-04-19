import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddActivityButton } from "@/components/features/itinerary/AddActivityButton";

describe("AddActivityButton", () => {
  it("calls onClick with the insertion index", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<AddActivityButton index={2} onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /add a place/i }));
    expect(onClick).toHaveBeenCalledWith(2);
  });

  it("renders a visible '+ Add a place' label", () => {
    render(<AddActivityButton index={0} onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent(/add a place/i);
  });

  it("uses the provided ariaLabel for screen readers while keeping the visible label", () => {
    render(
      <AddActivityButton
        index={1}
        onClick={() => {}}
        ariaLabel="Add a place between Tsukiji Hongwanji and Suitengu"
      />,
    );
    const btn = screen.getByRole("button", {
      name: "Add a place between Tsukiji Hongwanji and Suitengu",
    });
    expect(btn).toHaveTextContent(/add a place/i);
  });

  it("falls back to a generic accessible name when ariaLabel is omitted", () => {
    render(<AddActivityButton index={0} onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /add a place/i })).toBeInTheDocument();
  });

  it("renders a dashed border (visual weight upgrade from the old ghost circle)", () => {
    render(<AddActivityButton index={0} onClick={() => {}} />);
    const btn = screen.getByRole("button", { name: /add a place/i });
    expect(btn.className).toMatch(/border-dashed/);
  });
});
