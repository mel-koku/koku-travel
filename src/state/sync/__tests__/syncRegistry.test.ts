import { describe, it, expect, beforeEach } from "vitest";
import { createSyncRegistry } from "../syncRegistry";

describe("syncRegistry", () => {
  let registry: ReturnType<typeof createSyncRegistry>;

  beforeEach(() => {
    registry = createSyncRegistry();
  });

  it("stores registered slice serializers under their key", () => {
    const serializer = {
      key: "saved",
      serialize: (s: { saved: string[] }) => ({ saved: s.saved }),
      deserialize: (raw: unknown) => (raw as { saved?: string[] }).saved ?? [],
    };
    registry.register(serializer);
    expect(registry.get("saved")).toBe(serializer);
  });

  it("throws when registering the same key twice", () => {
    const s = {
      key: "saved",
      serialize: () => ({}),
      deserialize: () => [],
    };
    registry.register(s);
    expect(() => registry.register(s)).toThrow(/already registered/);
  });

  it("lists all registered keys", () => {
    registry.register({ key: "saved", serialize: () => ({}), deserialize: () => [] });
    registry.register({ key: "trips", serialize: () => ({}), deserialize: () => [] });
    expect(registry.keys().sort()).toEqual(["saved", "trips"]);
  });
});
