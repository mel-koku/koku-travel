/**
 * Runtime assertions for Supabase query results before unsafe casts.
 * Guards against schema drift or unexpected null data from PostgREST.
 */

const REQUIRED_LOCATION_FIELDS = ["id", "name", "region", "city", "category", "image"] as const;

/**
 * Asserts that a single database result has the minimum required fields
 * for a Location row before it is cast to LocationDbRow.
 *
 * @throws Error if the data is not an object or is missing required fields
 */
export function assertLocationDbRow(data: unknown, context: string): asserts data is Record<string, unknown> {
  if (!data || typeof data !== "object") {
    throw new Error(`[${context}] Expected object, got ${typeof data}`);
  }
  for (const field of REQUIRED_LOCATION_FIELDS) {
    if (!(field in data)) {
      throw new Error(`[${context}] Missing required field: ${field}`);
    }
  }
}

/**
 * Asserts that an array of database results all have the minimum required fields.
 *
 * @throws Error if any row is missing required fields (reports first failure)
 */
export function assertLocationDbRows(data: unknown[], context: string): void {
  for (let i = 0; i < data.length; i++) {
    assertLocationDbRow(data[i], `${context}[${i}]`);
  }
}
