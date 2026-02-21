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
 * @param context - Optional additional context (route, requestId, etc.)
 * @returns NextResponse with error JSON
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown,
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  const isProduction = process.env.NODE_ENV === "production";

  // Log full error details server-side with structured context
  const logContext: Record<string, unknown> = {
    status,
    code: code || "UNKNOWN",
    ...(context || {}),
  };
  if (details) {
    logContext.details = details;
  }
  logger.error(`API Error ${status}: ${message}`, undefined, logContext);

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
export function badRequest(
  message: string,
  details?: unknown,
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  return createErrorResponse(message, 400, "BAD_REQUEST", details, context);
}

/**
 * Creates a 401 Unauthorized error response.
 */
export function unauthorized(
  message: string = "Authentication required",
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  return createErrorResponse(message, 401, "UNAUTHORIZED", undefined, context);
}

/**
 * Creates a 403 Forbidden error response.
 */
export function forbidden(
  message: string = "Access forbidden",
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  return createErrorResponse(message, 403, "FORBIDDEN", undefined, context);
}

/**
 * Creates a 404 Not Found error response.
 */
export function notFound(
  message: string = "Resource not found",
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  return createErrorResponse(message, 404, "NOT_FOUND", undefined, context);
}

/**
 * Creates a 500 Internal Server Error response.
 */
export function internalError(
  message: string = "An internal error occurred",
  details?: unknown,
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  return createErrorResponse(message, 500, "INTERNAL_ERROR", details, context);
}

/**
 * Creates a 504 Gateway Timeout error response.
 */
export function gatewayTimeout(
  message: string = "Request timed out",
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  return createErrorResponse(message, 504, "GATEWAY_TIMEOUT", undefined, context);
}

/**
 * Creates a 503 Service Unavailable error response.
 */
export function serviceUnavailable(
  message: string = "Service temporarily unavailable",
  context?: { route?: string; requestId?: string; [key: string]: unknown },
): NextResponse<ApiError> {
  return createErrorResponse(message, 503, "SERVICE_UNAVAILABLE", undefined, context);
}

