import { NextRequest, NextResponse } from "next/server";
import { logger } from "../logger";
import { checkRateLimit } from "./rateLimit";
import {
  createRequestContext,
  addRequestContextHeaders,
  requireAuth,
  getOptionalAuth,
  requireJsonContentType,
  type RequestContext,
} from "./middleware";
import { internalError } from "./errors";
import type { User } from "@supabase/supabase-js";

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

type HandlerOptions = {
  rateLimit?: RateLimitConfig;
  requireAuth?: boolean;
  optionalAuth?: boolean;
  requireJson?: boolean;
};

type HandlerContext = {
  context: RequestContext;
  user: User | null;
};

type HandlerFn = (
  request: NextRequest,
  ctx: HandlerContext,
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with standard boilerplate:
 * - Request context creation (requestId, IP)
 * - Rate limiting
 * - Optional JSON content-type validation
 * - Optional authentication (required or optional)
 * - Error handling with structured logging
 * - Request context headers on response
 *
 * Usage:
 * ```ts
 * export const GET = withApiHandler(
 *   async (request, { context, user }) => {
 *     return NextResponse.json({ ok: true });
 *   },
 *   { rateLimit: { maxRequests: 200, windowMs: 60_000 } },
 * );
 * ```
 */
export function withApiHandler(handler: HandlerFn, options: HandlerOptions = {}) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = createRequestContext(request);

    // Rate limiting
    if (options.rateLimit) {
      const rateLimitResponse = await checkRateLimit(request, options.rateLimit);
      if (rateLimitResponse) {
        return addRequestContextHeaders(rateLimitResponse, context);
      }
    }

    // JSON content-type check (for POST/PUT/PATCH)
    if (options.requireJson) {
      const contentTypeError = requireJsonContentType(request, context);
      if (contentTypeError) return contentTypeError;
    }

    // Authentication
    let user: User | null = null;
    let finalContext = context;

    if (options.requireAuth) {
      const authResult = await requireAuth(request, context);
      if (authResult instanceof NextResponse) {
        return addRequestContextHeaders(authResult, context);
      }
      user = authResult.user;
      finalContext = authResult.context;
    } else if (options.optionalAuth) {
      const authResult = await getOptionalAuth(request, context);
      user = authResult.user;
      finalContext = authResult.context;
    }

    try {
      const response = await handler(request, { context: finalContext, user });
      return addRequestContextHeaders(response, finalContext);
    } catch (error) {
      logger.error(
        `Unhandled error in ${request.method} ${request.nextUrl.pathname}`,
        error instanceof Error ? error : new Error(String(error)),
        { requestId: finalContext.requestId },
      );
      return addRequestContextHeaders(
        internalError(
          error instanceof Error ? error.message : "An internal error occurred",
          undefined,
          { requestId: finalContext.requestId },
        ),
        finalContext,
      );
    }
  };
}
