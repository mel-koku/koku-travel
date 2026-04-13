import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useEffect, useState } from "react";
import { GuideLocationsProvider, useGuideLocations } from "../GuideLocationsContext";
import type { Location } from "@/types/location";

const mkLocation = (id: string): Location => ({
  id,
  name: id,
  region: "Kansai",
  city: "Kyoto",
  category: "temple",
  image: "",
  description: "",
});

const locations: Location[] = [mkLocation("a"), mkLocation("b"), mkLocation("c")];
const noop = () => {};

/**
 * Helper that calls nextIndex three times during a single render and
 * exposes the indices via a callback. Mimics how LocationEmbedBlock
 * consumes the context.
 */
function ThreeCardConsumer({ onIndices }: { onIndices: (xs: number[]) => void }) {
  const { nextIndex } = useGuideLocations();
  const collected: number[] = [];
  collected.push(nextIndex());
  collected.push(nextIndex());
  collected.push(nextIndex());
  // Defer to avoid the "set state during render" warning.
  useEffect(() => {
    onIndices(collected);
  });
  return null;
}

/**
 * Wrapper that re-renders its children when the button is "clicked" via
 * effect, simulating the kind of state change that triggered the
 * original bug (e.g. opening the slide-out detail panel).
 */
function ReRenderHarness({ onIndices }: { onIndices: (xs: number[]) => void }) {
  const [, setTick] = useState(0);
  // Trigger a second render once after mount.
  useEffect(() => {
    setTick(1);
  }, []);
  return (
    <GuideLocationsProvider locations={locations} onSelectLocation={noop}>
      <ThreeCardConsumer onIndices={onIndices} />
    </GuideLocationsProvider>
  );
}

describe("GuideLocationsProvider", () => {
  it("nextIndex starts at 0 within a single render", () => {
    const all: number[][] = [];
    render(
      <GuideLocationsProvider locations={locations} onSelectLocation={noop}>
        <ThreeCardConsumer onIndices={(xs) => all.push(xs)} />
      </GuideLocationsProvider>,
    );
    expect(all[0]).toEqual([0, 1, 2]);
  });

  it("nextIndex resets to 0 on every re-render (no cross-render leak)", () => {
    // Regression test for d66d9d7d:
    // A `let counter = 0` outside useMemo combined with the memo cache
    // produced a stale closure that kept incrementing across renders.
    // Cards laid out left/right by index alternated visually on every
    // parent re-render. Indices must reset to 0 each render.
    const all: number[][] = [];
    render(<ReRenderHarness onIndices={(xs) => all.push(xs)} />);
    // Two renders → two collections of indices.
    expect(all.length).toBeGreaterThanOrEqual(2);
    // Every render restarts the count from 0.
    for (const indices of all) {
      expect(indices).toEqual([0, 1, 2]);
    }
  });
});
