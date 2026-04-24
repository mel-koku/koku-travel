import { describe, it, expect } from "vitest";
import { culturalPillar } from "../culturalPillar";

// Minimal mock rule that captures the last `.custom()` callback in the chain.
function captureCustomValidator(
  validationFn: (rule: unknown) => unknown
): (val: unknown) => true | string {
  let capturedFn: ((val: unknown) => true | string) = () => true;
  const mockRule: Record<string, unknown> = {};
  ["required", "max", "min"].forEach((m) => {
    mockRule[m] = () => mockRule;
  });
  mockRule.custom = (fn: (val: unknown) => true | string) => {
    capturedFn = fn;
    return mockRule;
  };
  validationFn(mockRule);
  return capturedFn;
}

function getDocValidator(fieldName: string) {
  const field = culturalPillar.fields.find((f) => f.name === fieldName);
  if (!field?.validation) throw new Error(`No validation on field "${fieldName}"`);
  return captureCustomValidator(field.validation as (rule: unknown) => unknown);
}

function getBehaviorValidator(fieldName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const behaviorsField = culturalPillar.fields.find((f) => f.name === "behaviors") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subField = behaviorsField.of[0].fields.find((f: any) => f.name === fieldName);
  if (!subField?.validation) throw new Error(`No validation on behavior field "${fieldName}"`);
  return captureCustomValidator(subField.validation as (rule: unknown) => unknown);
}

const DOC_FIELDS = ["tagline", "concept", "inPractice", "forTravelers", "briefIntro"];
const BEHAVIOR_FIELDS = ["situation", "action", "why"];

describe("culturalPillar schema — em-dash validation", () => {
  for (const fieldName of DOC_FIELDS) {
    describe(`${fieldName}`, () => {
      const validator = () => getDocValidator(fieldName);

      it("passes a clean string", () => {
        expect(validator()("No dashes here.")).toBe(true);
      });

      it("rejects ASCII em-dash --", () => {
        const result = validator()("text -- more text");
        expect(typeof result).toBe("string");
        expect(result).toContain("em-dash");
      });

      it("rejects unicode em-dash —", () => {
        const result = validator()("text — more text");
        expect(typeof result).toBe("string");
        expect(result).toContain("em-dash");
      });

      it("passes undefined", () => {
        expect(validator()(undefined)).toBe(true);
      });
    });
  }

  for (const fieldName of BEHAVIOR_FIELDS) {
    describe(`behaviors.${fieldName}`, () => {
      const validator = () => getBehaviorValidator(fieldName);

      it("passes a clean string", () => {
        expect(validator()("No dashes here.")).toBe(true);
      });

      it("rejects ASCII em-dash --", () => {
        const result = validator()("text -- more text");
        expect(typeof result).toBe("string");
        expect(result).toContain("em-dash");
      });

      it("rejects unicode em-dash —", () => {
        const result = validator()("text — more text");
        expect(typeof result).toBe("string");
        expect(result).toContain("em-dash");
      });

      it("passes undefined", () => {
        expect(validator()(undefined)).toBe(true);
      });
    });
  }
});
