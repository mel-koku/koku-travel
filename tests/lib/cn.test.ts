import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("cn utility", () => {
  it("should join multiple class names", () => {
    expect(cn("class1", "class2", "class3")).toBe("class1 class2 class3");
  });

  it("should filter out falsy values", () => {
    expect(cn("class1", false, "class2", null, "class3", undefined)).toBe("class1 class2 class3");
  });

  it("should handle empty arrays", () => {
    expect(cn()).toBe("");
  });

  it("should handle all falsy values", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("should handle mixed truthy and falsy values", () => {
    expect(cn("class1", false, "class2", null, undefined, "class3")).toBe("class1 class2 class3");
  });

  it("should handle single class name", () => {
    expect(cn("single-class")).toBe("single-class");
  });

  it("should handle whitespace in class names", () => {
    expect(cn("class1  class2", "class3")).toBe("class1  class2 class3");
  });

  it("should filter out empty strings", () => {
    expect(cn("class1", "", "class2")).toBe("class1 class2");
  });
});

