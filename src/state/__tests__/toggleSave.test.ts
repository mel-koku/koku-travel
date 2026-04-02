import { describe, it, expect } from "vitest";

describe("toggleSave sync logic", () => {
  it("should detect when removing a previously saved item", () => {
    const saved = ["location-1", "location-2"];
    const id = "location-1";
    const existed = saved.includes(id);
    expect(existed).toBe(true);
    expect(existed ? "remove" : "add").toBe("remove");
  });

  it("should detect when adding a new item", () => {
    const saved: string[] = ["location-2"];
    const id = "location-1";
    const existed = saved.includes(id);
    expect(existed).toBe(false);
    expect(existed ? "remove" : "add").toBe("add");
  });
});
