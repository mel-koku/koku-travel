import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "./errors";

/**
 * Default maximum request body size: 1MB
 * This prevents DoS attacks via large request bodies
 */
export const DEFAULT_MAX_BODY_SIZE = 1024 * 1024; // 1MB

/**
 * Checks if the request body size exceeds the limit.
 * For Next.js App Router, we need to check the Content-Length header
 * or read the body stream to check size.
 * 
 * @param request - Next.js request object
 * @param maxSize - Maximum allowed body size in bytes (default: 1MB)
 * @returns null if within limit, or NextResponse with 413 error if exceeded
 */
export async function checkBodySizeLimit(
  request: NextRequest,
  maxSize: number = DEFAULT_MAX_BODY_SIZE,
): Promise<NextResponse | null> {
  const contentLength = request.headers.get("content-length");
  
  // If Content-Length header is present, check it first
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxSize) {
      return badRequest(
        `Request body too large. Maximum size is ${maxSize} bytes (${Math.round(maxSize / 1024)}KB).`,
        { size, maxSize },
        { route: request.nextUrl.pathname },
      );
    }
  }
  
  // For requests without Content-Length header, we'll need to check the body
  // However, reading the body consumes the stream, so we'll clone the request
  // Note: This is a best-effort check. The actual body might be slightly different
  // due to encoding, but Content-Length should be accurate for most cases.
  
  return null;
}

/**
 * Reads and validates request body size, returning the body text.
 * Throws an error if body exceeds maxSize.
 * 
 * @param request - Next.js request object
 * @param maxSize - Maximum allowed body size in bytes (default: 1MB)
 * @returns The body text if within limit
 * @throws Returns NextResponse with 413 error if exceeded
 */
export async function readBodyWithSizeLimit(
  request: NextRequest,
  maxSize: number = DEFAULT_MAX_BODY_SIZE,
): Promise<{ body: string; response: null } | { body: null; response: NextResponse }> {
  // First check Content-Length header if available
  const sizeCheck = await checkBodySizeLimit(request, maxSize);
  if (sizeCheck) {
    return { body: null, response: sizeCheck };
  }
  
  // Read the body
  const body = await request.text();
  
  // Check actual body size
  if (body.length > maxSize) {
    return {
      body: null,
      response: badRequest(
        `Request body too large. Maximum size is ${maxSize} bytes (${Math.round(maxSize / 1024)}KB).`,
        { size: body.length, maxSize },
        { route: request.nextUrl.pathname },
      ),
    };
  }
  
  return { body, response: null };
}

