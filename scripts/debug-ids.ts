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

  // Get sample DB entries
  const { data: dbLocs } = await supabase.from("locations").select("id, name, region").limit(10);
  console.log("Sample DB entries:");
  dbLocs?.forEach(l => console.log(`  ID: ${l.id}`));
  console.log();

  // Load enriched and try to match
  const enrichedPath = join(process.cwd(), "tmp", "enriched-locations.json");
  const data = JSON.parse(readFileSync(enrichedPath, "utf-8"));

  // Try to find matches
  const dbIds = new Set(dbLocs?.map(l => l.id) || []);

  console.log("Trying to match enriched data to DB:");
  let matches = 0;
  for (const loc of data.locations.slice(0, 20)) {
    const generatedId = generateLocationId(loc.name, loc.region);
    const isMatch = dbIds.has(generatedId);
    if (loc.description) {
      console.log(`  ${isMatch ? "✓" : "✗"} ${generatedId.substring(0, 40)}... (${loc.name.substring(0, 30)})`);
      if (isMatch) matches++;
    }
  }
  console.log(`\nMatches found: ${matches}`);

  // Check if DB uses different IDs
  const firstDbLoc = dbLocs?.[0];
  if (firstDbLoc) {
    // Try to find this location in enriched data by name
    const enrichedMatch = data.locations.find((l: any) =>
      l.name.toLowerCase() === firstDbLoc.name.toLowerCase() ||
      l.googleDisplayName?.toLowerCase() === firstDbLoc.name.toLowerCase()
    );
    if (enrichedMatch) {
      console.log(`\nFound enriched match for DB location "${firstDbLoc.name}":`);
      console.log(`  Enriched name: ${enrichedMatch.name}`);
      console.log(`  Generated ID would be: ${generateLocationId(enrichedMatch.name, enrichedMatch.region)}`);
      console.log(`  Actual DB ID: ${firstDbLoc.id}`);
    }
  }
}

debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
