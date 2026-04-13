import { describe, it, expect } from "vitest";
import { isUuid } from "../validation";

describe("isUuid", () => {
  it("accepts a canonical v4 UUID", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts uppercase UUIDs (case-insensitive)", () => {
    expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects missing hyphens", () => {
    expect(isUuid("550e8400e29b41d4a716446655440000")).toBe(false);
  });

  it("rejects sql-injection payloads", () => {
    expect(isUuid("'; drop table trips; --")).toBe(false);
  });

  it("rejects empty string and undefined-ish inputs", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid("undefined")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("rejects strings with extra characters", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000x")).toBe(false);
    expect(isUuid(" 550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });
});
