import { describe, it, expect } from "vitest";
import { conflict } from "../errors";

describe("conflict()", () => {
  it("returns 409 with default CONFLICT code", async () => {
    const res = conflict("Already free");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Already free");
    expect(body.code).toBe("CONFLICT");
  });

  it("returns 409 with overridden code and context", async () => {
    const res = conflict("Already free", { requestId: "req-1" }, "free_access_enabled");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Already free");
    expect(body.code).toBe("free_access_enabled");
  });
});
