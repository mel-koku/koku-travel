import { isValidSignature } from "@sanity/webhook";
import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { serviceUnavailable, unauthorized, badRequest } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { sanityWebhookPayloadSchema } from "@/lib/api/schemas";
import { sanitizePath } from "@/lib/api/sanitization";
import type { z } from "zod";

import { env } from "@/lib/env";

const SIGNATURE_HEADER = "x-sanity-signature";
const SECRET = env.sanityRevalidateSecret || env.sanityPreviewSecret;
const MAX_PAYLOAD_SIZE = 64 * 1024; // 64KB max payload size

function normalizePaths(payload: z.infer<typeof sanityWebhookPayloadSchema>): string[] {
  const paths = new Set<string>();
  
  // Validate and sanitize paths array
  if (payload.paths && Array.isArray(payload.paths)) {
    for (const path of payload.paths) {
      if (typeof path === "string" && path.trim().length > 0) {
        // Sanitize each path to prevent path traversal
        const sanitized = sanitizePath(path.trim());
        if (sanitized) {
          paths.add(sanitized.startsWith("/") ? sanitized : `/${sanitized}`);
        }
      }
    }
  }

  // Validate and sanitize slug
  const slug = payload.slug?.current;
  if (slug && typeof slug === "string") {
    const sanitizedSlug = sanitizePath(slug.trim());
    if (sanitizedSlug) {
      paths.add("/guides");
      const slugPath = sanitizedSlug.startsWith("/") 
        ? sanitizedSlug.replace(/^\//, "") 
        : sanitizedSlug;
      paths.add(`/guides/${slugPath}`);
    }
  }

  if (payload._type === "guide") {
    paths.add("/guides");
  }

  if (paths.size === 0) {
    paths.add("/guides");
  }

  return Array.from(paths);
}

/**
 * POST /api/revalidate
 * Webhook endpoint for Sanity CMS to trigger Next.js cache revalidation.
 * Validates webhook signature and sanitizes paths before revalidating.
 *
 * @param request - Next.js request object
 * @param request.headers.x-sanity-signature - Webhook signature (must be valid)
 * @param request.body - JSON payload containing paths and slug to revalidate (max 64KB)
 * @param request.body.paths - Array of paths to revalidate (optional)
 * @param request.body.slug - Slug object with current value (optional)
 * @param request.body._type - Content type (e.g., "guide")
 * @returns JSON response with revalidated paths, or error response
 * @throws Returns 400 if payload is invalid, too large, or parsing fails
 * @throws Returns 401 if signature is invalid
 * @throws Returns 429 if rate limit exceeded (20 requests/minute)
 * @throws Returns 503 if revalidation secret is not configured
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP (webhook endpoint - lower limit)
  const rateLimitResponse = await checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!SECRET) {
    return serviceUnavailable("Revalidation secret is not configured on the server.");
  }

  const signature = request.headers.get(SIGNATURE_HEADER) ?? "";
  
  // Validate signature header format
  if (!signature || typeof signature !== "string" || signature.length > 500) {
    return unauthorized("Invalid signature header format.");
  }

  // Get raw body for signature validation (must be done before parsing)
  const rawBody = await request.text();

  // Validate payload size before processing
  if (rawBody.length > MAX_PAYLOAD_SIZE) {
    return badRequest(`Payload too large (max ${MAX_PAYLOAD_SIZE} bytes).`);
  }

  if (!isValidSignature(rawBody, signature, SECRET)) {
    return unauthorized("Invalid signature.");
  }

  // Parse and validate JSON structure using Zod schema
  let jsonPayload: unknown;
  try {
    jsonPayload = JSON.parse(rawBody);
  } catch (error) {
    return badRequest("Failed to parse webhook payload.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const validation = sanityWebhookPayloadSchema.safeParse(jsonPayload);
  
  if (!validation.success) {
    return badRequest("Invalid webhook payload structure.", {
      errors: validation.error.issues,
    });
  }

  const payload = validation.data;
  const paths = normalizePaths(payload);

  // Additional safety: limit number of paths to revalidate
  const MAX_PATHS = 100;
  const pathsToRevalidate = paths.slice(0, MAX_PATHS);

  for (const path of pathsToRevalidate) {
    // Double-check path is safe before revalidating
    const sanitized = sanitizePath(path);
    if (sanitized) {
      revalidatePath(sanitized);
    }
  }

  revalidateTag("guides", "page");

  return NextResponse.json({ revalidated: pathsToRevalidate, tags: ["guides"] });
}

