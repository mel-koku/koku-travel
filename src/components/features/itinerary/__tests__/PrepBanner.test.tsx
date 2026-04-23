import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PrepBanner } from "../PrepBanner";
import { TripsProvider } from "@/state/slices/TripsSlice";
import type { StoredTrip } from "@/services/trip/types";
import type { ReactElement } from "react";

// Mock fetch for PATCH calls
const mockFetch = vi.fn();

// Mock useToast
vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

function renderWithProviders(ui: ReactElement) {
  return render(<TripsProvider>{ui}</TripsProvider>);
}

// Build dates relative to today so tests stay deterministic regardless of
// when the suite runs. getTripStatus uses the real clock.
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ prepState: {} }),
  });
  sessionStorage.clear();
});

function makeUpcomingTrip(overrides: Partial<StoredTrip> = {}): StoredTrip {
  return {
    id: "trip-1",
    name: "Tokyo",
    createdAt: daysFromNow(-10),
    updatedAt: daysFromNow(-10),
    itinerary: { days: [] } as unknown as StoredTrip["itinerary"],
    builderData: {
      duration: 5,
      cities: ["tokyo"],
      regions: ["kanto"],
      dates: { start: daysFromNow(15), end: daysFromNow(19) },
    } as unknown as StoredTrip["builderData"],
    prepState: {},
    ...overrides,
  } as StoredTrip;
}

function makeActiveTrip(): StoredTrip {
  return makeUpcomingTrip({
    builderData: {
      duration: 5,
      cities: ["tokyo"],
      regions: ["kanto"],
      dates: { start: daysFromNow(0), end: daysFromNow(4) },
    } as unknown as StoredTrip["builderData"],
  });
}

describe("PrepBanner", () => {
  it("renders nothing when trip status is active", () => {
    const { container } = renderWithProviders(<PrepBanner trip={makeActiveTrip()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when trip status is upcoming", () => {
    renderWithProviders(<PrepBanner trip={makeUpcomingTrip()} />);
    expect(screen.getByText(/in \d+ days|tomorrow/i)).toBeInTheDocument();
  });

  it("shows countdown for 2+ days as 'in N days'", () => {
    renderWithProviders(<PrepBanner trip={makeUpcomingTrip()} />);
    expect(screen.getByText(/in \d+ days/i)).toBeInTheDocument();
  });

  it("renders checkbox items and ticking optimistically updates", async () => {
    renderWithProviders(<PrepBanner trip={makeUpcomingTrip()} />);

    const checkbox = screen.getByRole("checkbox", { name: /check passport validity/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    // Optimistic: immediately checked before network resolves
    expect(checkbox).toBeChecked();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/api/trips/trip-1/prep-state");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      itemId: "passport-validity",
      checked: true,
    });
  });

  it("rolls back tick on PATCH failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: "boom" }) });

    renderWithProviders(<PrepBanner trip={makeUpcomingTrip()} />);
    const checkbox = screen.getByRole("checkbox", { name: /check passport validity/i });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it("hides 'If your trip has…' section when no conditionals match", () => {
    renderWithProviders(<PrepBanner trip={makeUpcomingTrip()} />);
    expect(screen.queryByText(/If your trip has/i)).not.toBeInTheDocument();
  });

  it("shows 'If your trip has…' section when a conditional matches (takkyubin)", () => {
    const trip = makeUpcomingTrip({
      builderData: {
        duration: 10,
        cities: ["tokyo", "kyoto", "osaka"],
        regions: ["kanto", "kansai"],
        dates: { start: daysFromNow(15), end: daysFromNow(24) },
      } as unknown as StoredTrip["builderData"],
    });
    renderWithProviders(<PrepBanner trip={trip} />);
    expect(screen.getByText(/If your trip has/i)).toBeInTheDocument();
    expect(screen.getByText(/Takkyubin/i)).toBeInTheDocument();
  });

  it("collapses to one-line 'Prep complete' when all applicable items checked", () => {
    const trip = makeUpcomingTrip();
    const allChecked: Record<string, boolean> = {};
    // 15 always-shown items for a 1-city short trip (no conditionals)
    for (const id of [
      "passport-validity", "travel-insurance", "fx-fee-review", "unlock-foreign-block",
      "decide-internet", "visit-japan-web", "mobile-suica",
      "install-internet", "maps-offline", "translate-offline", "safety-tips-app", "yen-cash-plan",
      "plug-adapter", "towel-and-bag", "no-tipping",
    ]) {
      allChecked[id] = true;
    }
    trip.prepState = allChecked;

    renderWithProviders(<PrepBanner trip={trip} />);
    expect(screen.getByText(/Prep complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /check passport validity/i })).not.toBeInTheDocument();
  });

  it("sends a PATCH with the merged prepState body (slice-update prerequisite)", async () => {
    // The TripsSlice update happens via tripsActions.updateTripPrepState after
    // a successful PATCH. This test verifies the PATCH path works so that the
    // slice-update runs — the slice reducer itself is unit-tested elsewhere.
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ prepState: { "passport-validity": true } }),
    });

    renderWithProviders(<PrepBanner trip={makeUpcomingTrip()} />);

    const checkbox = screen.getByRole("checkbox", { name: /check passport validity/i });
    fireEvent.click(checkbox);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [, init] = mockFetch.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toEqual({
      itemId: "passport-validity",
      checked: true,
    });
    // Tick remains (optimistic state holds even after PATCH resolves)
    expect(checkbox).toBeChecked();
  });
});
