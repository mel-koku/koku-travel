/**
 * Zod validation schemas for API route inputs
 */

import { z } from "zod";

/**
 * Schema for location ID parameter
 */
export const locationIdSchema = z
  .string()
  .min(1, "Location ID cannot be empty")
  .max(255, "Location ID too long")
  .regex(/^[A-Za-z0-9._-]+$/, "Location ID contains invalid characters")
  .refine((val) => !val.includes("..") && !val.includes("//"), {
    message: "Location ID contains path traversal characters",
  });

/**
 * Schema for photo name parameter (Google Places API format)
 */
export const photoNameSchema = z
  .string()
  .min(1, "Photo name cannot be empty")
  .max(500, "Photo name too long")
  .regex(/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/, "Invalid photo name format");

/**
 * Schema for positive integer query parameters
 */
export const positiveIntSchema = z
  .string()
  .regex(/^\d+$/, "Must be a positive integer")
  .transform((val) => Number.parseInt(val, 10))
  .pipe(z.number().int().positive().max(10000));

/**
 * Schema for optional positive integer query parameters with max value
 */
export function createMaxDimensionSchema(maxValue: number) {
  return z
    .string()
    .regex(/^\d+$/, "Must be a positive integer")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().int().positive().max(maxValue))
    .optional();
}

/**
 * Schema for preview route slug parameter
 * Must be a safe path segment
 */
export const previewSlugSchema = z
  .string()
  .min(1, "Slug cannot be empty")
  .max(500, "Slug too long")
  .refine(
    (val) => {
      // Reject path traversal
      if (val.includes("..") || val.includes("//") || val.includes("\\")) {
        return false;
      }
      // Allow relative paths starting with /
      if (val.startsWith("/")) {
        const segments = val.split("/").filter((s) => s.length > 0);
        return segments.every((seg) => /^[A-Za-z0-9._-]+$/.test(seg));
      }
      // Allow simple slugs
      return /^[A-Za-z0-9._/-]+$/.test(val);
    },
    {
      message: "Slug contains invalid characters or path traversal attempts",
    },
  );

/**
 * Schema for redirect URL parameter (preview/exit route)
 * Must be a safe relative path or same-origin URL
 */
export const redirectUrlSchema = z
  .string()
  .min(1, "Redirect URL cannot be empty")
  .max(2048, "Redirect URL too long")
  .refine(
    (val) => {
      const trimmed = val.trim();
      // Reject protocol-relative URLs
      if (trimmed.startsWith("//")) {
        return false;
      }
      // Reject dangerous protocols
      const lowerTrimmed = trimmed.toLowerCase();
      const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:", "about:"];
      if (dangerousProtocols.some((proto) => lowerTrimmed.startsWith(proto))) {
        return false;
      }
      // Allow relative paths
      if (trimmed.startsWith("/")) {
        return !trimmed.includes("..") && !trimmed.includes("//");
      }
      // Reject absolute URLs (open redirect prevention)
      try {
        new URL(trimmed);
        return false; // Absolute URLs not allowed
      } catch {
        // Not a valid URL, treat as relative path
        return !trimmed.includes("..") && !trimmed.includes("//");
      }
    },
    {
      message: "Invalid or unsafe redirect URL",
    },
  );

/**
 * Schema for secret parameter (preview/revalidate routes)
 */
export const secretSchema = z
  .string()
  .min(1, "Secret cannot be empty")
  .max(500, "Secret too long")
  .refine((val) => !val.includes("\n") && !val.includes("\r"), {
    message: "Secret contains invalid characters",
  });

/**
 * Helper to validate query parameters
 */
export function validateQueryParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T,
) {
  const params: Record<string, string | null> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return schema.safeParse(params);
}

/**
 * Helper to validate request body JSON
 */
export async function validateRequestBody<T extends z.ZodSchema>(
  request: Request,
  schema: T,
  maxSize: number = 1024 * 1024, // 1MB default
) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return {
      success: false,
      error: {
        issues: [
          {
            code: "invalid_type",
            expected: "application/json",
            received: contentType || "unknown",
            path: [],
            message: "Content-Type must be application/json",
          },
        ],
      },
    } as { success: false; error: { issues: Array<{ code: string; path: unknown[]; message: string; expected?: string; received?: string }> } };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > maxSize) {
    return {
      success: false,
      error: {
        issues: [
          {
            code: "too_big",
            maximum: maxSize,
            type: "string",
            inclusive: true,
            path: [],
            message: `Request body too large (max ${maxSize} bytes)`,
          },
        ],
      },
    } as { success: false; error: { issues: Array<{ code: string; path: unknown[]; message: string; maximum?: number; type?: string; inclusive?: boolean }> } };
  }

  try {
    const text = await request.text();
    if (text.length > maxSize) {
      return {
        success: false,
        error: {
          issues: [
            {
              code: "too_big",
              maximum: maxSize,
              type: "string",
              inclusive: true,
              path: [],
              message: `Request body too large (max ${maxSize} bytes)`,
            },
          ],
        },
      } as { success: false; error: { issues: Array<{ code: string; path: unknown[]; message: string; maximum?: number; type?: string; inclusive?: boolean }> } };
    }

    const json = JSON.parse(text);
    return schema.safeParse(json);
  } catch (error) {
    return {
      success: false,
      error: {
        issues: [
          {
            code: "custom",
            path: [],
            message: error instanceof Error ? error.message : "Invalid JSON",
          },
        ],
      },
    } as { success: false; error: { issues: Array<{ code: string; path: unknown[]; message: string }> } };
  }
}

