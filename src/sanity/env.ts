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
