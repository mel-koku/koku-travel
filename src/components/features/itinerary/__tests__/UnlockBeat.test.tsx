import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnlockBeat } from "@/components/features/itinerary/chapter/UnlockBeat";

describe("UnlockBeat", () => {
  it("renders the price and city list", () => {
    render(
      <UnlockBeat
        cities={["Kyoto", "Nara"]}
        totalDays={7}
        priceLabel="$19"
        onUnlock={vi.fn()}
      />,
    );
    expect(screen.getByText(/Kyoto, Nara/)).toBeInTheDocument();
    expect(screen.getByText(/\$19/)).toBeInTheDocument();
  });

  it("calls onUnlock when CTA clicked", () => {
    const onUnlock = vi.fn();
    render(
      <UnlockBeat
        cities={["Kyoto"]}
        totalDays={3}
        priceLabel="$19"
        onUnlock={onUnlock}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("renders as a spine-compatible element (data-beat='unlock')", () => {
    const { container } = render(
      <UnlockBeat
        cities={["Kyoto"]}
        totalDays={3}
        priceLabel="$19"
        onUnlock={vi.fn()}
      />,
    );
    expect(container.querySelector("[data-beat='unlock']")).toBeTruthy();
  });

  it("renders the login CTA when loginRequired is set (guest + free promo)", () => {
    render(
      <UnlockBeat
        cities={["Kyoto", "Nara"]}
        totalDays={7}
        priceLabel="$19"
        launchSlotsRemaining={42}
        loginRequired
        onUnlock={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /log in to see full itinerary/i })).toBeInTheDocument();
    expect(screen.queryByText(/\$19/)).not.toBeInTheDocument();
    expect(screen.queryByText(/launch slots remaining/i)).not.toBeInTheDocument();
  });
});
