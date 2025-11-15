/**
 * Sanity Studio environment variables
 * 
 * NOTE: This file is separate from src/lib/env.ts because:
 * - Sanity Studio runs in the browser and requires NEXT_PUBLIC_ prefixed variables
 * - src/lib/env.ts focuses on server-side variables (without NEXT_PUBLIC_ prefix)
 * - Studio needs these variables available at build time for client-side code
 * 
 * For server-side Sanity operations, use src/lib/sanity/config.ts which uses src/lib/env.ts
 */

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-11-13'

// Allow these to be undefined during build time
// Validation will happen at runtime when Studio is actually used
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined || v === '') {
    throw new Error(errorMessage)
  }

  return v
}

/**
 * Validates that required Sanity environment variables are set.
 * Call this at runtime when Studio is actually used.
 */
export function validateSanityEnv(): void {
  assertValue(
    process.env.NEXT_PUBLIC_SANITY_DATASET,
    'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
  )
  assertValue(
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
  )
}
