import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddressAutocomplete } from "@/components/features/itinerary/AddressAutocomplete";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("AddressAutocomplete", () => {
  it("does not fire request before 3 characters", async () => {
    const user = userEvent.setup();
    render(<AddressAutocomplete onSelect={vi.fn()} onUseAsIs={vi.fn()} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "ra");
    // Wait past debounce
    await new Promise((r) => setTimeout(r, 400));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fires one request after 300ms debounce once 3+ chars are typed", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [{ id: "m-1", title: "Ramen", subtitle: "Tokyo" }] }),
    });
    const user = userEvent.setup();
    render(<AddressAutocomplete onSelect={vi.fn()} onUseAsIs={vi.fn()} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "ram");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Ramen")).toBeInTheDocument();
  });

  it("renders 'Search Google instead' and 'Use as-is' options always", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ suggestions: [] }) });
    const user = userEvent.setup();
    render(<AddressAutocomplete onSelect={vi.fn()} onUseAsIs={vi.fn()} />);
    await user.type(screen.getByRole("textbox"), "xyz");
    expect(await screen.findByText(/Search Google instead/i)).toBeInTheDocument();
    expect(await screen.findByText(/Use "xyz" as-is/i)).toBeInTheDocument();
  });
});
