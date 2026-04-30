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
        loginRequired
        onUnlock={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /log in to see full itinerary/i })).toBeInTheDocument();
    expect(screen.queryByText(/\$19/)).not.toBeInTheDocument();
  });

  it("body copy mentions the free launch promo when loginRequired", () => {
    render(
      <UnlockBeat
        cities={["Kyoto"]}
        totalDays={5}
        priceLabel="$19"
        loginRequired
        onUnlock={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Trip Pass is free during our launch/i),
    ).toBeInTheDocument();
    // Default-state copy should NOT show during the promo.
    expect(screen.queryByText(/Day 1 is yours free/i)).not.toBeInTheDocument();
  });

  it("fine-print under CTA explains login when loginRequired", () => {
    render(
      <UnlockBeat
        cities={["Kyoto"]}
        totalDays={5}
        priceLabel="$19"
        loginRequired
        onUnlock={vi.fn()}
      />,
    );
    const note = screen.getByText(/Sign in required to claim\./i);
    expect(note).toBeInTheDocument();
    expect(note.textContent).not.toMatch(/passes remaining/i);
    expect(note.textContent).not.toMatch(/\d+/);
  });

  it("default (paid) body copy is unchanged", () => {
    render(
      <UnlockBeat
        cities={["Kyoto"]}
        totalDays={5}
        priceLabel="$19"
        onUnlock={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Day 1 is yours free\. Unlock to see everything\./i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Trip Pass is free during our launch/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign in required to claim/i)).not.toBeInTheDocument();
  });
});
