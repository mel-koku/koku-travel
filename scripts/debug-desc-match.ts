#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

function generateLocationId(name: string, region: string): string {
  const normalized = `${name}-${region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const hash = createHash("md5").update(`${name}-${region}`).digest("hex").substring(0, 8);
  return `${normalized}-${hash}`;
}

async function debug() {
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Get DB locations without descriptions
  const { data: dbLocs } = await supabase
    .from("locations")
    .select("id, name, short_description")
    .limit(1000);

  const needDesc = dbLocs?.filter(l => !l.short_description || !l.short_description.trim()) || [];
  console.log(`DB locations needing descriptions: ${needDesc.length}`);

  // Load enriched data
  const enrichedPath = join(process.cwd(), "tmp", "enriched-locations.json");
  const data = JSON.parse(readFileSync(enrichedPath, "utf-8"));

  // Build maps
  const enrichedById = new Map<string, any>();
  const enrichedWithDescById = new Map<string, string>();

  for (const loc of data.locations) {
    const id = generateLocationId(loc.name, loc.region);
    enrichedById.set(id, loc);
    if (loc.description && loc.description.trim()) {
      enrichedWithDescById.set(id, loc.description);
    }
  }

  console.log(`Enriched locations total: ${enrichedById.size}`);
  console.log(`Enriched locations with descriptions: ${enrichedWithDescById.size}`);

  // Check how many DB locations exist in enriched data
  let inEnriched = 0;
  let inEnrichedWithDesc = 0;

  for (const loc of needDesc) {
    if (enrichedById.has(loc.id)) {
      inEnriched++;
      if (enrichedWithDescById.has(loc.id)) {
        inEnrichedWithDesc++;
      }
    }
  }

  console.log(`\nDB locations needing desc that exist in enriched: ${inEnriched}`);
  console.log(`DB locations needing desc that have desc in enriched: ${inEnrichedWithDesc}`);

  // Sample - show some that need desc but have it in enriched
  console.log("\nSample matches (need desc in DB, have desc in enriched):");
  let shown = 0;
  for (const loc of needDesc) {
    if (enrichedWithDescById.has(loc.id) && shown < 5) {
      console.log(`  ${loc.id}: ${enrichedWithDescById.get(loc.id)?.substring(0, 60)}...`);
      shown++;
    }
  }

  // Sample - show some that need desc and DON'T exist in enriched
  console.log("\nSample DB locations NOT in enriched data:");
  shown = 0;
  for (const loc of needDesc) {
    if (!enrichedById.has(loc.id) && shown < 5) {
      console.log(`  ${loc.id} (${loc.name})`);
      shown++;
    }
  }
}

debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
