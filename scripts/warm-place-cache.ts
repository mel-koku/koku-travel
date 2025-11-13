import "dotenv/config";

import { MOCK_LOCATIONS } from "../src/data/mockLocations";

const API_BASE_URL = process.env.LOCAL_API_BASE_URL ?? "http://localhost:3000";
const REQUEST_DELAY_MS = Number(process.env.WARM_CACHE_DELAY_MS ?? 500);

async function warmLocation(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/locations/${id}`);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to warm cache for ${id}. Status ${response.status}. Body: ${errorBody}`);
  }

  console.log(`✅ Cached ${id}`);
}

async function main() {
  console.log(`Warming Google Places cache for ${MOCK_LOCATIONS.length} locations via ${API_BASE_URL}`);

  for (const { id } of MOCK_LOCATIONS) {
    try {
      await warmLocation(id);
    } catch (error) {
      console.error(`❌ ${id}`, error);
    }

    if (REQUEST_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  console.log("🎉 Completed place_details warming pass.");
}

main().catch((error) => {
  console.error("[warm-place-cache] Unhandled error", error);
  process.exit(1);
});

