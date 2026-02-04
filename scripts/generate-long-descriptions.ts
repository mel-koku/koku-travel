#!/usr/bin/env tsx
/**
 * Long Description Generator Script
 *
 * Generates detailed, engaging descriptions for location detail modals.
 * Uses an export/import workflow where Claude Code generates the descriptions.
 *
 * Usage:
 *   npx tsx scripts/generate-long-descriptions.ts --status           # Show progress
 *   npx tsx scripts/generate-long-descriptions.ts --export           # Export locations needing descriptions
 *   npx tsx scripts/generate-long-descriptions.ts --export --limit 50
 *   npx tsx scripts/generate-long-descriptions.ts --import           # Import generated descriptions
 *
 * Workflow:
 *   1. Run --export to create long-descriptions-todo.json
 *   2. Ask Claude Code to generate descriptions from the file
 *   3. Run --import to update the database from long-descriptions-generated.json
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// File paths
const EXPORT_FILE = path.join(process.cwd(), "long-descriptions-todo.json");
const IMPORT_FILE = path.join(process.cwd(), "long-descriptions-generated.json");

// Parse arguments
const args = process.argv.slice(2);
const isStatusMode = args.includes("--status");
const isExportMode = args.includes("--export");
const isImportMode = args.includes("--import");
const limitArg = args.find((arg) => arg.startsWith("--limit"));
const limit = limitArg
  ? parseInt(args[args.indexOf(limitArg) + 1], 10)
  : undefined;

// Validate environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Supabase credentials not configured in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LocationData {
  id: string;
  name: string;
  category: string;
  city: string;
  region: string;
  prefecture: string | null;
  description: string | null;
  short_description: string | null;
  editorial_summary: string | null;
  rating: number | null;
  review_count: number | null;
  google_primary_type: string | null;
  estimated_duration: string | null;
}

interface ExportLocation {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  rating: string;
  duration: string | null;
  existingInfo: string | null;
}

interface ImportDescription {
  id: string;
  description: string;
}

/**
 * Check if a description needs improvement
 */
function needsImprovement(location: LocationData): boolean {
  const desc = location.description;
  if (!desc) return true;

  // Too short
  if (desc.length < 80) return true;

  // Truncated (no ending punctuation)
  if (!/[.!?]$/.test(desc.trim())) return true;

  // Looks like an address
  if (/^\d+.*\d{3,}(-\d+)?$/.test(desc) || /Ward,.*\d{3}/.test(desc)) return true;

  // Contains ellipsis (truncated)
  if (desc.includes("…") || desc.includes("...")) return true;

  return false;
}

/**
 * Show status of descriptions
 */
async function showStatus(): Promise<void> {
  console.log("\n=== Long Description Status ===\n");

  const { count: total } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  // Fetch a sample to analyze quality
  const { data: sample } = await supabase
    .from("locations")
    .select("id, name, description, short_description, editorial_summary")
    .limit(1000);

  if (!sample) {
    console.error("Failed to fetch sample data");
    return;
  }

  const needsWork = sample.filter((loc) =>
    needsImprovement(loc as LocationData)
  ).length;
  const estimatedTotal = Math.round((needsWork / sample.length) * (total || 0));

  console.log(`Total locations:              ${(total || 0).toLocaleString()}`);
  console.log(`Estimated needing work:       ${estimatedTotal.toLocaleString()} (~${Math.round((needsWork / sample.length) * 100)}%)`);
  console.log(`Sample analyzed:              ${sample.length}`);
  console.log(`Sample needing improvement:   ${needsWork}`);

  // Check for pending files
  console.log("\n--- File Status ---");
  if (fs.existsSync(EXPORT_FILE)) {
    const data = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf-8"));
    console.log(`Export file exists:           ${data.length} locations pending`);
  } else {
    console.log(`Export file:                  Not found`);
  }

  if (fs.existsSync(IMPORT_FILE)) {
    const data = JSON.parse(fs.readFileSync(IMPORT_FILE, "utf-8"));
    console.log(`Import file exists:           ${data.length} descriptions ready`);
  } else {
    console.log(`Import file:                  Not found`);
  }

  // Show examples
  console.log("\n--- Examples Needing Improvement ---\n");
  const examples = sample.filter((loc) => needsImprovement(loc as LocationData)).slice(0, 5);
  examples.forEach((loc) => {
    console.log(`  ${loc.name}`);
    console.log(`    Current: "${loc.description?.substring(0, 80)}${(loc.description?.length || 0) > 80 ? "..." : ""}"`);
    console.log("");
  });

  console.log("--- Next Steps ---");
  console.log("1. Run: npx tsx scripts/generate-long-descriptions.ts --export --limit 50");
  console.log("2. Ask Claude Code: \"Generate descriptions for long-descriptions-todo.json\"");
  console.log("3. Run: npx tsx scripts/generate-long-descriptions.ts --import");
}

/**
 * Export locations needing descriptions
 */
async function exportLocations(): Promise<void> {
  console.log("\n=== Exporting Locations for Long Descriptions ===\n");

  // Fetch all locations - need to fetch all to find those needing work
  // Supabase default limit is 1000, so we need multiple fetches for large datasets
  let allLocations: LocationData[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch, error } = await supabase
      .from("locations")
      .select(
        "id, name, category, city, region, prefecture, description, short_description, editorial_summary, rating, review_count, google_primary_type, estimated_duration"
      )
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Failed to fetch locations:", error);
      return;
    }

    if (!batch || batch.length === 0) break;
    allLocations = allLocations.concat(batch as LocationData[]);
    offset += batchSize;

    if (batch.length < batchSize) break; // Last batch
  }

  console.log(`Fetched ${allLocations.length} total locations`);

  // Filter to those needing work
  let locations = (allLocations as LocationData[]).filter(needsImprovement);

  if (limit) {
    locations = locations.slice(0, limit);
  }

  if (locations.length === 0) {
    console.log("No locations need description improvements!");
    return;
  }

  // Transform to export format
  const exportData: ExportLocation[] = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    type: loc.google_primary_type || loc.category,
    city: loc.city,
    region: loc.region,
    rating: loc.rating ? `${loc.rating}/5 (${loc.review_count} reviews)` : "N/A",
    duration: loc.estimated_duration,
    existingInfo: loc.short_description || loc.editorial_summary || loc.description || null,
  }));

  // Write to file
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(exportData, null, 2));

  console.log(`Exported ${exportData.length} locations to: ${EXPORT_FILE}`);
  console.log("\n--- Sample Locations ---");
  exportData.slice(0, 5).forEach((loc) => {
    console.log(`  - ${loc.name} (${loc.city}, ${loc.type})`);
    if (loc.existingInfo) {
      console.log(`    Info: "${loc.existingInfo.substring(0, 60)}..."`);
    }
  });

  console.log("\n--- Next Step ---");
  console.log("Ask Claude Code to generate descriptions:");
  console.log(`  "Generate long descriptions for the ${exportData.length} locations in long-descriptions-todo.json`);
  console.log(`   Save results to long-descriptions-generated.json"`);
}

/**
 * Import generated descriptions
 */
async function importDescriptions(): Promise<void> {
  console.log("\n=== Importing Long Descriptions ===\n");

  if (!fs.existsSync(IMPORT_FILE)) {
    console.error(`Error: Import file not found: ${IMPORT_FILE}`);
    console.error("Generate descriptions first, then save them to this file.");
    process.exit(1);
  }

  // Read import file
  const descriptions: ImportDescription[] = JSON.parse(
    fs.readFileSync(IMPORT_FILE, "utf-8")
  );

  if (!descriptions || descriptions.length === 0) {
    console.log("No descriptions to import.");
    return;
  }

  console.log(`Found ${descriptions.length} descriptions to import`);

  let successful = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  for (const item of descriptions) {
    if (!item.id || !item.description) {
      console.warn(`Skipping invalid entry: ${JSON.stringify(item)}`);
      failed++;
      continue;
    }

    // Validate description
    if (item.description.length > 800) {
      console.warn(`Description too long for ${item.id}: ${item.description.length} chars, truncating`);
      item.description = item.description.substring(0, 797) + "...";
    }

    const { error } = await supabase
      .from("locations")
      .update({ description: item.description })
      .eq("id", item.id);

    if (error) {
      console.error(`Failed to update ${item.id}:`, error.message);
      errors.push({ id: item.id, error: error.message });
      failed++;
    } else {
      successful++;
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Total processed: ${descriptions.length}`);
  console.log(`Successful:      ${successful}`);
  console.log(`Failed:          ${failed}`);

  if (errors.length > 0) {
    console.log("\n--- Errors ---");
    errors.slice(0, 10).forEach((e) => console.log(`  ${e.id}: ${e.error}`));
  }

  // Archive files after successful import
  if (successful > 0) {
    const timestamp = new Date().toISOString().split("T")[0];
    const archivePath = path.join(
      process.cwd(),
      "scripts",
      `long-descriptions-imported-${timestamp}.json`
    );
    fs.renameSync(IMPORT_FILE, archivePath);
    console.log(`\nArchived import file to: ${archivePath}`);

    if (fs.existsSync(EXPORT_FILE)) {
      fs.unlinkSync(EXPORT_FILE);
      console.log(`Removed export file: ${EXPORT_FILE}`);
    }
  }

  console.log("\n--- Next Step ---");
  console.log("Check status: npx tsx scripts/generate-long-descriptions.ts --status");
}

// Main
async function main(): Promise<void> {
  if (isStatusMode) {
    await showStatus();
  } else if (isExportMode) {
    await exportLocations();
  } else if (isImportMode) {
    await importDescriptions();
  } else {
    console.log("Usage:");
    console.log("  npx tsx scripts/generate-long-descriptions.ts --status         # Show status");
    console.log("  npx tsx scripts/generate-long-descriptions.ts --export         # Export locations");
    console.log("  npx tsx scripts/generate-long-descriptions.ts --export --limit 50");
    console.log("  npx tsx scripts/generate-long-descriptions.ts --import         # Import descriptions");
  }
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
