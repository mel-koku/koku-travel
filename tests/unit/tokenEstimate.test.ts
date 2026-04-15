import { describe, it, expect } from "vitest";
import { estimateInputTokens } from "@/lib/api/tokenEstimate";

describe("estimateInputTokens", () => {
  it("returns 1 for empty string (floor)", () => {
    expect(estimateInputTokens("")).toBe(1);
  });

  it("uses chars/3.5 conservatively, rounding up", () => {
    // "hello world" = 11 chars / 3.5 = 3.14 → ceil 4
    expect(estimateInputTokens("hello world")).toBe(4);
  });

  it("sums across an array of strings", () => {
    expect(estimateInputTokens(["hello", "world"])).toBe(
      estimateInputTokens("hello") + estimateInputTokens("world"),
    );
  });
});
