import { describe, it, expect } from "vitest";
import { isUuid, isValidSlug } from "../validation";

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

describe("isValidSlug", () => {
  it("accepts common slug shapes", () => {
    expect(isValidSlug("yamada-taro")).toBe(true);
    expect(isValidSlug("kyoto-arashiyama-guide")).toBe(true);
    expect(isValidSlug("snake_case_slug")).toBe(true);
    expect(isValidSlug("Mixed-Case-Handle")).toBe(true);
    expect(isValidSlug("dotted.handle")).toBe(true);
    expect(isValidSlug("simple")).toBe(true);
    expect(isValidSlug("123")).toBe(true);
    expect(isValidSlug("a1.b2_c3-d4")).toBe(true);
  });

  it("rejects spaces, slashes, and other unsafe characters", () => {
    expect(isValidSlug("yamada taro")).toBe(false);
    expect(isValidSlug("yamada/taro")).toBe(false);
    expect(isValidSlug("yamada\\taro")).toBe(false);
    expect(isValidSlug("yamada?taro")).toBe(false);
    expect(isValidSlug("yamada#taro")).toBe(false);
  });

  it("rejects path traversal and injection payloads", () => {
    expect(isValidSlug("../etc/passwd")).toBe(false);
    expect(isValidSlug("..")).toBe(false);
    expect(isValidSlug("foo..bar")).toBe(false);
    expect(isValidSlug("'; drop table people; --")).toBe(false);
  });

  it("rejects empty, oversized, and non-string inputs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("   ")).toBe(false);
    expect(isValidSlug("a".repeat(101))).toBe(false);
    expect(isValidSlug(undefined)).toBe(false);
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug(123)).toBe(false);
  });
});
