import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
vi.mock("@/lib/supabase/serviceRole", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

import { GET } from "../route";

describe("GET /api/launch-pricing", () => {
  beforeEach(() => {
    mockSingle.mockReset();
  });

  it("returns remaining and total when row exists", async () => {
    mockSingle.mockResolvedValue({
      data: { remaining_slots: 247, total_slots: 300 },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ remaining: 247, total: 300 });
  });

  it("returns null shape when no row exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ remaining: null, total: null });
  });

  it("returns null shape on database error", async () => {
    mockSingle.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ remaining: null, total: null });
  });
});
