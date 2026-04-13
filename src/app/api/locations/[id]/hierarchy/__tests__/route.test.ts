import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/locations/locationService", () => ({
  fetchLocationById: vi.fn(),
}));
vi.mock("@/lib/locations/hierarchyService", () => ({
  fetchHierarchyContext: vi.fn(),
}));

import { GET } from "../route";
import { fetchLocationById } from "@/lib/locations/locationService";

function req() {
  return new NextRequest("http://localhost/api/locations/x/hierarchy");
}

describe("GET /api/locations/[id]/hierarchy param validation", () => {
  // Location IDs are slug-format (e.g. arabica-kyoto-kansai-40fdfc3d), not UUIDs,
  // so the validator is isValidLocationId — an allow-list of [A-Za-z0-9._-].
  // Rejection cases below verify the dangerous-input guard still fires.

  it("returns 400 for sql-injection payload without hitting the DB", async () => {
    const res = await GET(req(), {
      params: Promise.resolve({ id: "'; drop table locations; --" }),
    });
    expect(res.status).toBe(400);
    expect(fetchLocationById).not.toHaveBeenCalled();
  });

  it("returns 400 for path-traversal sequences", async () => {
    const res = await GET(req(), {
      params: Promise.resolve({ id: "../../etc/passwd" }),
    });
    expect(res.status).toBe(400);
    expect(fetchLocationById).not.toHaveBeenCalled();
  });

  it("returns 400 for empty ids", async () => {
    const res = await GET(req(), {
      params: Promise.resolve({ id: "" }),
    });
    expect(res.status).toBe(400);
    expect(fetchLocationById).not.toHaveBeenCalled();
  });
});
