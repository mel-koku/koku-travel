import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

vi.mock("@/lib/api/withApiHandler", () => ({
  withApiHandler: (
    handler: Parameters<typeof import("@/lib/api/withApiHandler").withApiHandler>[0],
  ) =>
    async (request: NextRequest) =>
      handler(request, {
        context: { requestId: "test-req", route: "/api/locations/report", ip: "127.0.0.1" },
        user: null as unknown as User | null,
      }),
}));

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({
  insert: (...args: unknown[]) => {
    insertMock(...args);
    return {
      select: () => ({
        single: () => Promise.resolve({ data: { id: "report-uuid" }, error: null }),
      }),
    };
  },
}));

vi.mock("@/lib/supabase/serviceRole", () => ({
  getServiceRoleClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/rateLimits", () => ({
  RATE_LIMITS: {
    LOCATION_REPORTS: { maxRequests: 5, windowMs: 60_000 },
  },
}));

import { POST } from "../route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/locations/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  location_id: "kinkakuji-kyoto-kansai-abc123",
  report_type: "permanently_closed" as const,
  description: "Visited last week and the place is shuttered.",
};

describe("POST /api/locations/report", () => {
  beforeEach(() => {
    insertMock.mockClear();
    fromMock.mockClear();
  });

  it("accepts a valid report and returns 201", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    expect(fromMock).toHaveBeenCalledWith("location_reports");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        location_id: validBody.location_id,
        report_type: "permanently_closed",
        reporter_email: null,
        reporter_user_id: null,
      }),
    );
  });

  // Regression: an earlier draft used `z.string().email().nullish()` which rejects "" with a
  // ZodError. The form may legitimately send `reporter_email: ""` when the optional field is
  // left blank, so the route must coerce empty/whitespace to null instead of failing with 400.
  it("treats empty-string reporter_email as omitted (not 400)", async () => {
    const res = await POST(makeRequest({ ...validBody, reporter_email: "" }));
    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ reporter_email: null }),
    );
  });

  it("accepts a valid email", async () => {
    const res = await POST(
      makeRequest({ ...validBody, reporter_email: "user@example.com" }),
    );
    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ reporter_email: "user@example.com" }),
    );
  });

  it("rejects a malformed email", async () => {
    const res = await POST(
      makeRequest({ ...validBody, reporter_email: "not-an-email" }),
    );
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects descriptions shorter than 10 chars", async () => {
    const res = await POST(makeRequest({ ...validBody, description: "too short" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown report_type", async () => {
    const res = await POST(makeRequest({ ...validBody, report_type: "made_up" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a path-traversal location_id", async () => {
    const res = await POST(
      makeRequest({ ...validBody, location_id: "../../etc/passwd" }),
    );
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
