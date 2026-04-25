import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContextualUnlockPrompt } from "@/components/features/itinerary/ContextualUnlockPrompt";

describe("ContextualUnlockPrompt", () => {
  it("renders the priced unlock CTA by default", () => {
    render(
      <ContextualUnlockPrompt
        isOpen
        context="locked_day"
        tier="short"
        onUnlock={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /unlock for \$19/i })).toBeInTheDocument();
  });

  it("renders the login CTA when loginRequired is set (guest + free promo)", () => {
    render(
      <ContextualUnlockPrompt
        isOpen
        context="locked_day"
        tier="short"
        loginRequired
        onUnlock={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /log in to see full itinerary/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unlock for/i })).not.toBeInTheDocument();
  });

  it("calls onUnlock when the CTA is clicked in either mode", () => {
    const onUnlock = vi.fn();
    const { rerender } = render(
      <ContextualUnlockPrompt
        isOpen
        context="locked_day"
        tier="standard"
        onUnlock={onUnlock}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /unlock for/i }));

    rerender(
      <ContextualUnlockPrompt
        isOpen
        context="locked_day"
        tier="standard"
        loginRequired
        onUnlock={onUnlock}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /log in to see full itinerary/i }));
    expect(onUnlock).toHaveBeenCalledTimes(2);
  });
});
