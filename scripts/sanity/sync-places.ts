import "dotenv/config";

import { getServiceRoleClient } from "@/lib/supabase/serviceRole";
import { fetchLocationDetails } from "@/lib/googlePlaces";
import { storePlaceInCache } from "@/lib/cache/placeCache";
import type { Location } from "@/types/location";
import { logger } from "@/lib/logger";

const BATCH_SIZE = Number(process.env.SYNC_PLACES_BATCH_SIZE ?? 50);

async function fetchLocations() {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, region, place_id, coordinates, category")
    .not("place_id", "is", null);

  if (error) {
    throw new Error(`Failed to load locations: ${error.message}`);
  }

  return (data ?? []) as Array<{
    id: string;
    name: string;
    city: string;
    region: string;
    category: string;
    place_id: string;
    coordinates?: { lat: number; lng: number };
  }>;
}

async function syncLocation(location: Location) {
  const details = await fetchLocationDetails(location);
  await storePlaceInCache(location.placeId ?? details.placeId, details, location.coordinates);
}

async function main() {
  logger.info("Starting Sanity place sync");
  const locations = await fetchLocations();
  logger.info(`Found ${locations.length} locations with place IDs`);

  for (let index = 0; index < locations.length; index += 1) {
    const batch = locations.slice(index, index + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        const location: Location = {
          id: row.id,
          name: row.name,
          city: row.city,
          region: row.region,
          category: row.category ?? "point_of_interest",
          image: "",
          placeId: row.place_id,
          coordinates: row.coordinates,
        };

        try {
          await syncLocation(location);
          logger.info(`Synced place ${row.place_id}`);
        } catch (error) {
          logger.error(`Failed to sync place ${row.place_id}`, error instanceof Error ? error : new Error(String(error)));
        }
      }),
    );
    if (index + BATCH_SIZE < locations.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  logger.info("Sanity place sync completed");
}

main().catch((error) => {
  logger.error("Sanity place sync failed", error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});

