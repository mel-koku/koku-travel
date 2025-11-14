import { NextResponse } from "next/server";
import { logger } from "../logger";

export type ApiError = {
  error: string;
  code?: string;
  details?: unknown;
};

/**
 * Creates a standardized error response for API routes.
 * In production, error details are sanitized to prevent information disclosure.
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 * @param code - Optional error code for programmatic handling
 * @param details - Optional additional error details
 * @returns NextResponse with error JSON
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown,
): NextResponse<ApiError> {
  const isProduction = process.env.NODE_ENV === "production";

  // Log full error details server-side (always)
  logger.error(`API Error ${status}: ${message}`, undefined, details ? { details } : undefined);

  const error: ApiError = { error: message };
  if (code) {
    error.code = code;
  }
  // Only include details in development to prevent information disclosure in production
  if (!isProduction && details) {
    error.details = details;
  }

  return NextResponse.json(error, { status });
}

/**
 * Creates a 400 Bad Request error response.
 */
export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return createErrorResponse(message, 400, "BAD_REQUEST", details);
}

/**
 * Creates a 401 Unauthorized error response.
 */
export function unauthorized(message: string = "Authentication required"): NextResponse<ApiError> {
  return createErrorResponse(message, 401, "UNAUTHORIZED");
}

/**
 * Creates a 403 Forbidden error response.
 */
export function forbidden(message: string = "Access forbidden"): NextResponse<ApiError> {
  return createErrorResponse(message, 403, "FORBIDDEN");
}

/**
 * Creates a 404 Not Found error response.
 */
export function notFound(message: string = "Resource not found"): NextResponse<ApiError> {
  return createErrorResponse(message, 404, "NOT_FOUND");
}

/**
 * Creates a 500 Internal Server Error response.
 */
export function internalError(
  message: string = "An internal error occurred",
  details?: unknown,
): NextResponse<ApiError> {
  return createErrorResponse(message, 500, "INTERNAL_ERROR", details);
}

/**
 * Creates a 503 Service Unavailable error response.
 */
export function serviceUnavailable(
  message: string = "Service temporarily unavailable",
): NextResponse<ApiError> {
  return createErrorResponse(message, 503, "SERVICE_UNAVAILABLE");
}

