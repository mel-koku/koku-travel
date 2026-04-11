import { describe, it, expect } from "vitest";
import { extractApiErrorDetails } from "@/lib/utils/apiErrorDetails";

describe("extractApiErrorDetails", () => {
  it("returns empty object for null/undefined/primitive input", () => {
    expect(extractApiErrorDetails(null)).toEqual({});
    expect(extractApiErrorDetails(undefined)).toEqual({});
    expect(extractApiErrorDetails("string error")).toEqual({});
    expect(extractApiErrorDetails(42)).toEqual({});
  });

  it("captures error name when present", () => {
    const err = { name: "AI_APICallError" };
    expect(extractApiErrorDetails(err)).toEqual({ errorName: "AI_APICallError" });
  });

  it("captures status code when present", () => {
    const err = { statusCode: 400 };
    expect(extractApiErrorDetails(err)).toEqual({ statusCode: 400 });
  });

  it("strips query string from URL to avoid logging auth params", () => {
    const err = {
      url: "https://us-central1-aiplatform.googleapis.com/v1/projects/foo?key=SECRET",
    };
    expect(extractApiErrorDetails(err).url).toBe(
      "https://us-central1-aiplatform.googleapis.com/v1/projects/foo",
    );
  });

  it("truncates long response bodies to 500 chars", () => {
    const err = { responseBody: "x".repeat(2000) };
    const result = extractApiErrorDetails(err);
    expect((result.responseBody as string).length).toBe(500);
  });

  it("extracts nested data.error fields from Vertex structured errors", () => {
    const err = {
      name: "AI_APICallError",
      statusCode: 429,
      data: {
        error: {
          code: 429,
          status: "RESOURCE_EXHAUSTED",
          message: "Quota exceeded",
        },
      },
    };
    expect(extractApiErrorDetails(err)).toEqual({
      errorName: "AI_APICallError",
      statusCode: 429,
      apiErrorCode: 429,
      apiErrorStatus: "RESOURCE_EXHAUSTED",
      apiErrorMessage: "Quota exceeded",
    });
  });

  it("flags AbortError with aborted:true so timeouts are distinguishable from reject", () => {
    const err = { name: "AbortError" };
    expect(extractApiErrorDetails(err)).toEqual({
      errorName: "AbortError",
      aborted: true,
    });
  });

  it("flags TimeoutError with aborted:true (AbortSignal.timeout spec)", () => {
    const err = { name: "TimeoutError" };
    expect(extractApiErrorDetails(err)).toEqual({
      errorName: "TimeoutError",
      aborted: true,
    });
  });

  it("does not set aborted on ordinary Error instances", () => {
    const err = { name: "Error" };
    expect(extractApiErrorDetails(err).aborted).toBeUndefined();
  });

  it("handles partial data.error objects without throwing", () => {
    const err = { data: { error: { code: 500 } } };
    expect(extractApiErrorDetails(err)).toEqual({ apiErrorCode: 500 });
  });

  it("ignores data when it is not an object", () => {
    const err = { data: "not an object" };
    expect(extractApiErrorDetails(err)).toEqual({});
  });

  it("works with a real Error instance that has extra fields attached", () => {
    const err = Object.assign(new Error("Vertex rejected"), {
      name: "AI_APICallError",
      statusCode: 400,
      url: "https://example.com/v1/generate?secret=abc",
      responseBody: '{"error":{"code":400,"status":"INVALID_ARGUMENT"}}',
      data: {
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: "streaming function call is not supported in unary API.",
        },
      },
    });
    const result = extractApiErrorDetails(err);
    expect(result.errorName).toBe("AI_APICallError");
    expect(result.statusCode).toBe(400);
    expect(result.url).toBe("https://example.com/v1/generate");
    expect(result.apiErrorStatus).toBe("INVALID_ARGUMENT");
    expect(result.apiErrorMessage).toContain("streaming function call");
  });
});
