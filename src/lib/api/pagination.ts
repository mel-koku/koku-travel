import { NextRequest } from "next/server";
import { z } from "zod";

/**
 * Pagination configuration
 */
export type PaginationConfig = {
  page: number;
  limit: number;
  offset: number;
};

/**
 * Pagination metadata returned in responses
 */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

/**
 * Paginated response wrapper
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

/**
 * Default pagination limits
 */
export const PAGINATION_DEFAULTS = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1,
} as const;

/**
 * Schema for pagination query parameters
 */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "Page must be a positive integer")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().int().positive())
    .default(String(PAGINATION_DEFAULTS.DEFAULT_PAGE)),
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a positive integer")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().int().min(PAGINATION_DEFAULTS.MIN_LIMIT).max(PAGINATION_DEFAULTS.MAX_LIMIT))
    .default(String(PAGINATION_DEFAULTS.DEFAULT_LIMIT)),
});

/**
 * Parses pagination parameters from request query string
 */
export function parsePaginationParams(request: NextRequest): PaginationConfig {
  const { searchParams } = new URL(request.url);
  
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  
  const page = pageParam ? Number.parseInt(pageParam, 10) : PAGINATION_DEFAULTS.DEFAULT_PAGE;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : PAGINATION_DEFAULTS.DEFAULT_LIMIT;
  
  // Validate and clamp values
  const validPage = Math.max(1, Number.isNaN(page) ? PAGINATION_DEFAULTS.DEFAULT_PAGE : page);
  const validLimit = Math.max(
    PAGINATION_DEFAULTS.MIN_LIMIT,
    Math.min(
      PAGINATION_DEFAULTS.MAX_LIMIT,
      Number.isNaN(limit) ? PAGINATION_DEFAULTS.DEFAULT_LIMIT : limit,
    ),
  );
  
  return {
    page: validPage,
    limit: validLimit,
    offset: (validPage - 1) * validLimit,
  };
}

/**
 * Creates pagination metadata from total count and pagination config
 */
export function createPaginationMeta(
  total: number,
  config: PaginationConfig,
): PaginationMeta {
  const totalPages = Math.ceil(total / config.limit);
  
  return {
    page: config.page,
    limit: config.limit,
    total,
    totalPages,
    hasNext: config.page < totalPages,
    hasPrev: config.page > 1,
  };
}

/**
 * Creates a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  config: PaginationConfig,
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(total, config),
  };
}

