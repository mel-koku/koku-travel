import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRequest } from "../utils/mocks";

const { mockGetPersonWithExperiences, mockGetPersonBySlug, mockGetPersonAvailability } =
  vi.hoisted(() => ({
    mockGetPersonWithExperiences: vi.fn(),
    mockGetPersonBySlug: vi.fn(),
    mockGetPersonAvailability: vi.fn(),
  }));

vi.mock("@/lib/api/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/people/peopleService", () => ({
  getPersonWithExperiences: (...args: unknown[]) => mockGetPersonWithExperiences(...args),
  getPersonBySlug: (...args: unknown[]) => mockGetPersonBySlug(...args),
}));

vi.mock("@/lib/people/availabilityService", () => ({
  getPersonAvailability: (...args: unknown[]) => mockGetPersonAvailability(...args),
}));

vi.mock("@/lib/bookings/bookingService", () => ({
  getPersonBookedSlots: vi.fn().mockResolvedValue(new Set()),
}));

import { GET as getPerson } from "@/app/api/people/[slug]/route";
import { GET as getAvailability } from "@/app/api/people/[slug]/availability/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/people/[slug]", () => {
  it("rejects malformed slugs with 400 before hitting the DB", async () => {
    const request = createMockRequest("https://example.com/api/people/bad%20slug");
    const res = await getPerson(request, {
      params: Promise.resolve({ slug: "bad slug" }),
    });
    expect(res.status).toBe(400);
    expect(mockGetPersonWithExperiences).not.toHaveBeenCalled();
  });

  it("rejects path-traversal slugs with 400", async () => {
    const request = createMockRequest("https://example.com/api/people/whatever");
    const res = await getPerson(request, {
      params: Promise.resolve({ slug: "../etc/passwd" }),
    });
    expect(res.status).toBe(400);
    expect(mockGetPersonWithExperiences).not.toHaveBeenCalled();
  });

  it("returns 200 for a valid slug when the person exists", async () => {
    mockGetPersonWithExperiences.mockResolvedValue({ id: "p1", name: "Yamada Taro" });
    const request = createMockRequest("https://example.com/api/people/yamada-taro");
    const res = await getPerson(request, {
      params: Promise.resolve({ slug: "yamada-taro" }),
    });
    expect(res.status).toBe(200);
    expect(mockGetPersonWithExperiences).toHaveBeenCalledWith("yamada-taro");
  });

  it("returns 404 for a valid slug with no matching person", async () => {
    mockGetPersonWithExperiences.mockResolvedValue(null);
    const request = createMockRequest("https://example.com/api/people/missing");
    const res = await getPerson(request, {
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/people/[slug]/availability", () => {
  it("rejects malformed slugs with 400 before hitting the DB", async () => {
    const request = createMockRequest(
      "https://example.com/api/people/bad/availability?month=2026-04",
    );
    const res = await getAvailability(request, {
      params: Promise.resolve({ slug: "bad slug" }),
    });
    expect(res.status).toBe(400);
    expect(mockGetPersonBySlug).not.toHaveBeenCalled();
  });
});
