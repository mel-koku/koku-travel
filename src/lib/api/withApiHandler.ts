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
import { checkDailyQuota, type DailyQuotaConfig } from "./dailyQuota";
import type { User } from "@supabase/supabase-js";

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

type HandlerOptions = {
  rateLimit?: RateLimitConfig;
  dailyQuota?: DailyQuotaConfig;
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
 * // Simple route
 * export const GET = withApiHandler(
 *   async (request, { context, user }) => {
 *     return NextResponse.json({ ok: true });
 *   },
 *   { rateLimit: RATE_LIMITS.LOCATIONS },
 * );
 *
 * // Route with dynamic params
 * export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
 *   const { id } = await props.params;
 *   return withApiHandler(
 *     async (req, { context, user }) => {
 *       return NextResponse.json({ id });
 *     },
 *     { rateLimit: RATE_LIMITS.LOCATIONS },
 *   )(request);
 * }
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

    // Daily quota check (after auth so we can key by userId when available)
    if (options.dailyQuota) {
      const identifier = user?.id || finalContext.ip;
      const quotaResponse = await checkDailyQuota(identifier, options.dailyQuota);
      if (quotaResponse) {
        return addRequestContextHeaders(quotaResponse, finalContext);
      }
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
