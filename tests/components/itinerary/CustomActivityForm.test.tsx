import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomActivityForm } from "@/components/features/itinerary/CustomActivityForm";

describe("CustomActivityForm", () => {
  it("shows default fields and hides extras behind 'Add more details'", () => {
    render(<CustomActivityForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Phone/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Website/i)).not.toBeInTheDocument();
  });

  it("reveals extra fields when 'Add more details' is tapped", async () => {
    const user = userEvent.setup();
    render(<CustomActivityForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Add more details/i }));
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmation/i)).toBeInTheDocument();
  });

  it("calls onSubmit with an ItineraryActivity (kind: place, isCustom: true) when form submitted with title only", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CustomActivityForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/Title/i), "Grandma's Ramen");
    await user.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [activity, meta] = onSubmit.mock.calls[0];
    expect(activity.kind).toBe("place");
    expect(activity.isCustom).toBe(true);
    expect(activity.title).toBe("Grandma's Ramen");
    expect(activity.durationMin).toBe(60); // default
    expect(activity.coordinates).toBeUndefined(); // addressless
    expect(meta.addressSource).toBe("none");
  });

  it("requires title before enabling Save", async () => {
    const user = userEvent.setup();
    render(<CustomActivityForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const save = screen.getByRole("button", { name: /Save/i });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText(/Title/i), "X");
    expect(save).not.toBeDisabled();
  });
});
