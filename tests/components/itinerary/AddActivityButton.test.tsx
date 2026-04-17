import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddActivityButton } from "@/components/features/itinerary/AddActivityButton";

describe("AddActivityButton", () => {
  it("renders a subtle + affordance and calls onClick with the insertion index", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<AddActivityButton index={2} onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /add activity/i }));
    expect(onClick).toHaveBeenCalledWith(2);
  });
});
