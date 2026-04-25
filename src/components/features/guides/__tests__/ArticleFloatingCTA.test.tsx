import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { ArticleFloatingCTA } from "../ArticleFloatingCTA";
import type { Location } from "@/types/location";

const pushSpy = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

const toggleSaveSpy = vi.fn();
let savedIds = new Set<string>();
vi.mock("@/context/SavedContext", () => ({
  useSaved: () => ({
    saved: Array.from(savedIds),
    toggleSave: toggleSaveSpy,
    isInSaved: (id: string) => savedIds.has(id),
  }),
}));

const firstSaveToastSpy = vi.fn();
vi.mock("@/hooks/useFirstSaveToast", () => ({
  useFirstSaveToast: () => firstSaveToastSpy,
}));

// Capture every IntersectionObserver instance so tests can drive the
// content/bottom-CTA visibility callbacks directly.
type ObserverHandle = {
  callback: IntersectionObserverCallback;
  target: Element | null;
};
let observers: ObserverHandle[] = [];

class ControllableObserver {
  callback: IntersectionObserverCallback;
  target: Element | null = null;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
  root = null;
  rootMargin = "0px";
  thresholds = [0];
}

function fireVisibility(target: Element | null, isIntersecting: boolean) {
  const handle = observers.find((o) => o.target === target);
  if (!handle) throw new Error("No observer for target");
  act(() => {
    handle.callback(
      [{ isIntersecting, target } as unknown as IntersectionObserverEntry],
      handle as unknown as IntersectionObserver
    );
  });
}

function mkLocation(id: string, name = id): Location {
  return {
    id,
    name,
    region: "Kansai",
    city: "Kyoto",
    category: "temple",
    image: "https://example.com/img.jpg",
    description: "",
  };
}

type HarnessProps = {
  locationIds: string[];
  locations: Location[];
  onRefsReady: (
    content: HTMLDivElement | null,
    bottom: HTMLDivElement | null
  ) => void;
};

function Harness({ locationIds, locations, onRefsReady }: HarnessProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const bottomCtaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    onRefsReady(contentRef.current, bottomCtaRef.current);
  }, [onRefsReady]);
  return (
    <>
      <div ref={contentRef} data-testid="content" />
      <div ref={bottomCtaRef} data-testid="bottom-cta" />
      <ArticleFloatingCTA
        contentType="guide"
        slug="kyoto-temples"
        title="Best Kyoto Temples"
        locationIds={locationIds}
        locations={locations}
        city="Kyoto"
        region="Kansai"
        contentRef={contentRef}
        bottomCtaRef={bottomCtaRef}
      />
    </>
  );
}

function renderPillVisible(locationIds: string[], locations: Location[]) {
  let contentEl: HTMLDivElement | null = null;
  let bottomEl: HTMLDivElement | null = null;
  const result = render(
    <Harness
      locationIds={locationIds}
      locations={locations}
      onRefsReady={(c, b) => {
        contentEl = c;
        bottomEl = b;
      }}
    />
  );
  fireVisibility(contentEl, true);
  fireVisibility(bottomEl, false);
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  observers = [];
  savedIds = new Set<string>();
  // Override the global jsdom mock with our controllable one.
  globalThis.IntersectionObserver =
    ControllableObserver as unknown as typeof IntersectionObserver;
  localStorage.clear();
});

describe("ArticleFloatingCTA", () => {
  it("Plan click writes content-context and routes to /trip-builder", () => {
    renderPillVisible(["a", "b"], [mkLocation("a"), mkLocation("b")]);

    screen.getByRole("button", { name: "Plan" }).click();

    expect(pushSpy).toHaveBeenCalledWith("/trip-builder");
    const stored = localStorage.getItem("yuku:content-context");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({
      type: "guide",
      slug: "kyoto-temples",
      title: "Best Kyoto Temples",
      locationIds: ["a", "b"],
      city: "Kyoto",
      region: "Kansai",
    });
  });

  it("Plan click still navigates when localStorage.setItem throws", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    renderPillVisible(["a"], [mkLocation("a")]);
    screen.getByRole("button", { name: "Plan" }).click();

    expect(pushSpy).toHaveBeenCalledWith("/trip-builder");
    setItemSpy.mockRestore();
  });

  it("Save All toggles every unsaved id once and skips already-saved", () => {
    savedIds = new Set(["b"]);
    renderPillVisible(
      ["a", "b", "c"],
      [mkLocation("a"), mkLocation("b"), mkLocation("c")]
    );

    screen.getByRole("button", { name: "Save all places" }).click();

    expect(toggleSaveSpy).toHaveBeenCalledTimes(2);
    expect(toggleSaveSpy).toHaveBeenCalledWith("a");
    expect(toggleSaveSpy).toHaveBeenCalledWith("c");
    expect(toggleSaveSpy).not.toHaveBeenCalledWith("b");
  });

  it("Save All button is disabled and reads 'Saved' when all ids are already saved", () => {
    savedIds = new Set(["a", "b"]);
    renderPillVisible(["a", "b"], [mkLocation("a"), mkLocation("b")]);

    const btn = screen.getByRole("button", { name: "All places saved" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Saved");
    btn.click();
    expect(toggleSaveSpy).not.toHaveBeenCalled();
  });

  it("first-save toast fires only when no ids are pre-saved", () => {
    // Partial: one already saved → toast must NOT fire.
    savedIds = new Set(["a"]);
    const { unmount } = renderPillVisible(
      ["a", "b"],
      [mkLocation("a"), mkLocation("b")]
    );
    screen.getByRole("button", { name: "Save all places" }).click();
    expect(firstSaveToastSpy).not.toHaveBeenCalled();
    unmount();

    // Fresh: none saved → toast fires.
    vi.clearAllMocks();
    observers = [];
    savedIds = new Set();
    renderPillVisible(
      ["a", "b"],
      [mkLocation("a"), mkLocation("b")]
    );
    screen.getByRole("button", { name: "Save all places" }).click();
    expect(firstSaveToastSpy).toHaveBeenCalledTimes(1);
  });
});
