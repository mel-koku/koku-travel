import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HoursConfirmationFooter } from "@/components/features/itinerary/chapter/HoursConfirmationFooter";

describe("HoursConfirmationFooter", () => {
  it("renders the confirmation copy when hoursSource is google", () => {
    render(<HoursConfirmationFooter hoursSource="google" />);
    expect(screen.getByText(/Hours via Google\. Confirm before you go\./)).toBeInTheDocument();
  });

  it("renders nothing when hoursSource is not google", () => {
    const { container } = render(<HoursConfirmationFooter hoursSource="editorial" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when hoursSource is undefined", () => {
    const { container } = render(<HoursConfirmationFooter />);
    expect(container.firstChild).toBeNull();
  });
});
