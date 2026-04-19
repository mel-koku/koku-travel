import { describe, it, expect } from "vitest";
import { conflict } from "../errors";

describe("conflict()", () => {
  it("returns 409 with structured error body", async () => {
    const res = conflict("Already free", {
      code: "free_access_enabled",
      requestId: "req-1",
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Already free");
    expect(body.code).toBe("free_access_enabled");
  });
});
