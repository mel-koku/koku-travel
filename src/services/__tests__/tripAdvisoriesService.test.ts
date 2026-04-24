import { describe, it, expect, beforeEach } from "vitest";
import {
  getDismissedAdvisoriesLocal,
  dismissAdvisoryLocal,
  clearDismissedAdvisoriesLocal,
} from "@/services/tripAdvisoriesService";

describe("tripAdvisoriesService — guest localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty set when nothing dismissed", () => {
    expect(getDismissedAdvisoriesLocal("trip-1")).toEqual(new Set());
  });

  it("persists a dismissal", () => {
    dismissAdvisoryLocal("trip-1", "prep-checklist");
    expect(getDismissedAdvisoriesLocal("trip-1")).toEqual(
      new Set(["prep-checklist"]),
    );
  });

  it("scopes dismissals per trip", () => {
    dismissAdvisoryLocal("trip-1", "prep-checklist");
    dismissAdvisoryLocal("trip-2", "goshuin");
    expect(getDismissedAdvisoriesLocal("trip-1")).toEqual(
      new Set(["prep-checklist"]),
    );
    expect(getDismissedAdvisoriesLocal("trip-2")).toEqual(
      new Set(["goshuin"]),
    );
  });

  it("clears dismissals for a trip", () => {
    dismissAdvisoryLocal("trip-1", "prep-checklist");
    clearDismissedAdvisoriesLocal("trip-1");
    expect(getDismissedAdvisoriesLocal("trip-1")).toEqual(new Set());
  });

  it("survives a JSON parse error by returning empty", () => {
    localStorage.setItem("yuku-advisories-seen-trip-1", "not-json");
    expect(getDismissedAdvisoriesLocal("trip-1")).toEqual(new Set());
  });
});
