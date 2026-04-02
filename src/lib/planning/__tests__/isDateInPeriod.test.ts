import { describe, it, expect } from "vitest";

describe("cross-year date period detection", () => {
  it("should detect January 2 as within Dec 1 - Feb 28 period", () => {
    const date = new Date(2026, 0, 2); // Jan 2
    const month = date.getMonth() + 1; // 1
    const day = date.getDate(); // 2

    const startMonth = 12, startDay = 1, endMonth = 2, endDay = 28;

    let result = false;
    if (startMonth > endMonth) {
      if (month > startMonth || month < endMonth) result = true;
      else if (month === startMonth && day >= startDay) result = true;
      else if (month === endMonth && day <= endDay) result = true;
    }

    expect(result).toBe(true);
  });

  it("should detect December 28 as within Dec 28 - Jan 4 period", () => {
    const date = new Date(2025, 11, 28); // Dec 28
    const month = date.getMonth() + 1; // 12
    const day = date.getDate(); // 28

    const startMonth = 12, startDay = 28, endMonth = 1, endDay = 4;

    let result = false;
    if (startMonth > endMonth) {
      if (month > startMonth || month < endMonth) result = true;
      else if (month === startMonth && day >= startDay) result = true;
      else if (month === endMonth && day <= endDay) result = true;
    }

    expect(result).toBe(true);
  });

  it("should detect January 4 as within Dec 28 - Jan 4 period", () => {
    const date = new Date(2026, 0, 4); // Jan 4
    const month = date.getMonth() + 1; // 1
    const day = date.getDate(); // 4

    const startMonth = 12, startDay = 28, endMonth = 1, endDay = 4;

    let result = false;
    if (startMonth > endMonth) {
      if (month > startMonth || month < endMonth) result = true;
      else if (month === startMonth && day >= startDay) result = true;
      else if (month === endMonth && day <= endDay) result = true;
    }

    expect(result).toBe(true);
  });

  it("should NOT detect March 1 as within Dec 28 - Jan 4 period", () => {
    const date = new Date(2026, 2, 1); // Mar 1
    const month = date.getMonth() + 1; // 3
    const day = date.getDate(); // 1

    const startMonth = 12, startDay = 28, endMonth = 1, endDay = 4;

    let result = false;
    if (startMonth > endMonth) {
      if (month > startMonth || month < endMonth) result = true;
      else if (month === startMonth && day >= startDay) result = true;
      else if (month === endMonth && day <= endDay) result = true;
    }

    expect(result).toBe(false);
  });

  it("should NOT detect December 27 as within Dec 28 - Jan 4 period", () => {
    const date = new Date(2025, 11, 27); // Dec 27
    const month = date.getMonth() + 1; // 12
    const day = date.getDate(); // 27

    const startMonth = 12, startDay = 28, endMonth = 1, endDay = 4;

    let result = false;
    if (startMonth > endMonth) {
      if (month > startMonth || month < endMonth) result = true;
      else if (month === startMonth && day >= startDay) result = true;
      else if (month === endMonth && day <= endDay) result = true;
    }

    expect(result).toBe(false);
  });
});
