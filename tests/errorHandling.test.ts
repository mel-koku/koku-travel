import { describe, it, expect } from "vitest";
import {
  createErrorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  serviceUnavailable,
} from "../src/lib/api/errors";

describe("Error Handling", () => {
  describe("createErrorResponse", () => {
    it("should create error response with default status", async () => {
      const response = createErrorResponse("Test error");
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Test error");
      expect(data.code).toBeUndefined();
      expect(data.details).toBeUndefined();
    });

    it("should create error response with custom status", async () => {
      const response = createErrorResponse("Not found", 404);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Not found");
    });

    it("should include error code when provided", async () => {
      const response = createErrorResponse("Bad request", 400, "BAD_REQUEST");
      const data = await response.json();
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should include details when provided", async () => {
      const details = { field: "email", reason: "invalid format" };
      const response = createErrorResponse("Validation failed", 400, "VALIDATION_ERROR", details);
      const data = await response.json();
      expect(data.details).toEqual(details);
    });
  });

  describe("badRequest", () => {
    it("should create 400 error response", async () => {
      const response = badRequest("Invalid input");
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid input");
      expect(data.code).toBe("BAD_REQUEST");
    });

    it("should include details when provided", async () => {
      const details = { field: "email" };
      const response = badRequest("Invalid input", details);
      const data = await response.json();
      expect(data.details).toEqual(details);
    });
  });

  describe("unauthorized", () => {
    it("should create 401 error response with default message", async () => {
      const response = unauthorized();
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should create 401 error response with custom message", async () => {
      const response = unauthorized("Please log in");
      const data = await response.json();
      expect(data.error).toBe("Please log in");
    });
  });

  describe("forbidden", () => {
    it("should create 403 error response", async () => {
      const response = forbidden();
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe("FORBIDDEN");
    });
  });

  describe("notFound", () => {
    it("should create 404 error response", async () => {
      const response = notFound();
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  describe("internalError", () => {
    it("should create 500 error response", async () => {
      const response = internalError();
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should include details when provided", async () => {
      const details = { stack: "error stack" };
      const response = internalError("Server error", details);
      const data = await response.json();
      expect(data.details).toEqual(details);
    });
  });

  describe("serviceUnavailable", () => {
    it("should create 503 error response", async () => {
      const response = serviceUnavailable();
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.code).toBe("SERVICE_UNAVAILABLE");
    });
  });
});

