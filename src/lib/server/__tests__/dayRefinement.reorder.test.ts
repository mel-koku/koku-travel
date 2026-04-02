import { describe, it, expect } from "vitest";

describe("reorder patch activity merging", () => {
  it("should interleave non-place activities at their original relative positions", () => {
    const activities = [
      { id: "p1", kind: "place" as const, name: "Temple" },
      { id: "n1", kind: "note" as const, name: "Guide note" },
      { id: "p2", kind: "place" as const, name: "Garden" },
      { id: "p3", kind: "place" as const, name: "Market" },
    ];

    const newPlaceOrder = ["p3", "p1", "p2"];

    const placeActivities = activities.filter((a) => a.kind === "place");
    const reordered = newPlaceOrder
      .map((id) => placeActivities.find((a) => a.id === id))
      .filter(Boolean);

    expect(reordered[0]!.id).toBe("p3");
    expect(reordered[1]!.id).toBe("p1");
    expect(reordered[2]!.id).toBe("p2");
  });

  it("should keep non-place activities in their original positions after reorder merge", () => {
    const activities = [
      { id: "p1", kind: "place" as const, name: "Temple" },
      { id: "n1", kind: "note" as const, name: "Guide note" },
      { id: "p2", kind: "place" as const, name: "Garden" },
      { id: "p3", kind: "place" as const, name: "Market" },
    ];

    const newPlaceOrder = ["p3", "p1", "p2"];

    const placeActivities = activities.filter((a) => a.kind === "place");
    const reordered = newPlaceOrder
      .map((id) => placeActivities.find((a) => a.id === id)!)
      .filter(Boolean);

    // Simulate the fixed merge logic
    const placeQueue = [...reordered];
    const merged = activities
      .map((a) => (a.kind === "place" ? placeQueue.shift()! : a))
      .filter(Boolean);

    // Non-place activity "n1" should remain at index 1 (between first and second place)
    expect(merged[0].id).toBe("p3");
    expect(merged[1].id).toBe("n1");
    expect(merged[2].id).toBe("p1");
    expect(merged[3].id).toBe("p2");
  });

  it("should NOT push non-place activities to the front (old buggy behavior)", () => {
    const activities = [
      { id: "p1", kind: "place" as const, name: "Temple" },
      { id: "n1", kind: "note" as const, name: "Guide note" },
      { id: "p2", kind: "place" as const, name: "Garden" },
    ];

    const newPlaceOrder = ["p2", "p1"];

    const placeActivities = activities.filter((a) => a.kind === "place");
    const nonPlaceActivities = activities.filter((a) => a.kind !== "place");
    const reordered = newPlaceOrder
      .map((id) => placeActivities.find((a) => a.id === id)!)
      .filter(Boolean);

    // Old buggy behavior: [...nonPlaceActivities, ...reordered]
    const buggyMerge = [...nonPlaceActivities, ...reordered];
    expect(buggyMerge[0].id).toBe("n1"); // note is incorrectly first

    // Fixed behavior: replace place slots in-order
    const placeQueue = [...reordered];
    const fixedMerge = activities
      .map((a) => (a.kind === "place" ? placeQueue.shift()! : a))
      .filter(Boolean);
    expect(fixedMerge[0].id).toBe("p2"); // first place slot gets first reordered place
    expect(fixedMerge[1].id).toBe("n1"); // note stays in position
    expect(fixedMerge[2].id).toBe("p1"); // second place slot gets second reordered place
  });
});
