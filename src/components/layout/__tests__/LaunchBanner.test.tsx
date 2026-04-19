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
});
