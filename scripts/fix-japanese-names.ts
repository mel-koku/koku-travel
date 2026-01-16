#!/usr/bin/env tsx
/**
 * Script to fix Japanese location names by replacing them with English equivalents.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function fix() {
  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Find all locations with Japanese characters
  const { data: locations } = await supabase.from("locations").select("id, name");

  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
  const japaneseLocations = locations?.filter(l => japanesePattern.test(l.name)) || [];

  console.log("Locations with Japanese names:", japaneseLocations.length);

  for (const loc of japaneseLocations) {
    console.log("  -", loc.id, ":", loc.name);
  }

  if (japaneseLocations.length === 0) {
    console.log("\nNo Japanese names to fix!");
    return;
  }

  // Map of known Japanese names to English (from enriched data)
  const englishNames: Record<string, string> = {
    "yanagawa-punting-kyushu-d623d4f4": "Yanagawa Punting",
    "kyoto-style-chubu-8d95bdaf": "KYOTO Style",
    "suigun-rib-tours-chugoku-a5c2de38": "SUIGUN RIB TOURS",
    "hiroshima-onomichi-suigun-rib-tours-embark-chugoku-75de0419": "Hiroshima-Onomichi SUIGUN RIB TOURS",
    "-bando-yuki-shikoku-f736d186": "BANDO YUKI (Gunkanjima Tours)",
  };

  let fixed = 0;
  for (const loc of japaneseLocations) {
    const englishName = englishNames[loc.id];
    if (englishName) {
      const { error } = await supabase
        .from("locations")
        .update({ name: englishName })
        .eq("id", loc.id);

      if (error) {
        console.error(`Failed to update ${loc.id}:`, error.message);
      } else {
        console.log(`\nFixed: "${loc.name}" -> "${englishName}"`);
        fixed++;
      }
    } else {
      console.log(`\nNo English name found for: ${loc.id}`);
    }
  }

  console.log(`\n✅ Fixed ${fixed} location names`);
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
