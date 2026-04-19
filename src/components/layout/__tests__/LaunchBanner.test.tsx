import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LaunchBanner } from "../LaunchBanner";

describe("LaunchBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ remaining: 247, total: 300 }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders normal state when remaining > 20", () => {
    render(<LaunchBanner initialRemaining={247} initialTotal={300} />);
    expect(
      screen.getByText(/Trip Pass is free for our first 300 travellers/i),
    ).toBeInTheDocument();
    expect(screen.getByText("247 / 300")).toBeInTheDocument();
  });

  it("renders almost-gone state when remaining <= 20", () => {
    render(<LaunchBanner initialRemaining={12} initialTotal={300} />);
    expect(
      screen.getByText(/Almost gone\. Trip Pass is free for our final few travellers/i),
    ).toBeInTheDocument();
    expect(screen.getByText("12 / 300")).toBeInTheDocument();
  });

  it("renders sold-out state when remaining === 0", () => {
    render(<LaunchBanner initialRemaining={0} initialTotal={300} />);
    expect(
      screen.getByText(/Launch pricing now live from \$19/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0 \/ 300/)).not.toBeInTheDocument();
  });

  it("renders nothing when initialTotal is null", () => {
    const { container } = render(
      <LaunchBanner initialRemaining={null} initialTotal={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("hides after dismiss and persists to localStorage", () => {
    const { rerender } = render(
      <LaunchBanner initialRemaining={247} initialTotal={300} />,
    );
    const button = screen.getByRole("button", { name: /dismiss launch announcement/i });
    button.click();
    expect(window.localStorage.getItem("yuku.launch-banner.v1.dismissed")).toBe("1");
    rerender(<LaunchBanner initialRemaining={247} initialTotal={300} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("stays hidden on mount if previously dismissed", () => {
    window.localStorage.setItem("yuku.launch-banner.v1.dismissed", "1");
    render(<LaunchBanner initialRemaining={247} initialTotal={300} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("updates counter from polling response", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ remaining: 100, total: 300 }),
    }));
    render(<LaunchBanner initialRemaining={247} initialTotal={300} />);
    expect(screen.getByText("247 / 300")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.waitFor(() =>
      expect(screen.getByText("100 / 300")).toBeInTheDocument(),
    );
    vi.useRealTimers();
  });

  it("slows polling cadence to 5 minutes after the first 10 minutes", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ remaining: 200, total: 300 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LaunchBanner initialRemaining={247} initialTotal={300} />);

    // Fast window: 10 polls at 60s each (t=60s..600s).
    await vi.advanceTimersByTimeAsync(FAST_WINDOW_MS);
    expect(fetchMock).toHaveBeenCalledTimes(10);

    // Next 11 minutes (660s) at slow cadence (300s) should yield ~2 more polls,
    // not 11 as the naive 60s cadence would predict.
    await vi.advanceTimersByTimeAsync(660_000);
    expect(fetchMock.mock.calls.length).toBeLessThan(13);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(12);

    vi.useRealTimers();
  });

  it("resets to fast cadence when the window regains focus", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ remaining: 200, total: 300 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LaunchBanner initialRemaining={247} initialTotal={300} />);

    // Burn through fast window so we're in slow cadence.
    await vi.advanceTimersByTimeAsync(FAST_WINDOW_MS);
    const callsAfterFastWindow = fetchMock.mock.calls.length;

    // Refocus → should reset to fast cadence.
    window.dispatchEvent(new FocusEvent("focus"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFastWindow + 1);

    vi.useRealTimers();
  });
});

const FAST_WINDOW_MS = 600_000;
