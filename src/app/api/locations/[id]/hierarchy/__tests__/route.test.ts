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
  it("returns 400 for non-UUID id without hitting the DB", async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBe(400);
    expect(fetchLocationById).not.toHaveBeenCalled();
  });

  it("returns 400 for sql-injection payload", async () => {
    const res = await GET(req(), {
      params: Promise.resolve({ id: "'; drop table locations; --" }),
    });
    expect(res.status).toBe(400);
    expect(fetchLocationById).not.toHaveBeenCalled();
  });
});
