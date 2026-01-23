#!/usr/bin/env tsx
/**
 * AI Description Generator Script
 *
 * Generates engaging, editorial-style descriptions for locations using Claude Code.
 * Descriptions are stored in the `short_description` database column for display
 * on explore cards and itinerary cards.
 *
 * Usage:
 *   npm run generate:descriptions -- --status              # Show how many need descriptions
 *   npm run generate:descriptions -- --export --limit 50   # Export 50 locations to JSON
 *   npm run generate:descriptions -- --import              # Import generated descriptions
 *
 * Workflow:
 *   1. Run --export to create descriptions-todo.json
 *   2. Ask Claude Code to generate descriptions from the file
 *   3. Run --import to update the database from descriptions-generated.json
 */

// Load environment variables FIRST before any other imports
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

// Parse command line arguments early
const args = process.argv.slice(2);
const isExportMode = args.includes("--export");
const isImportMode = args.includes("--import");
const isStatusMode = args.includes("--status");

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL must be configured in .env.local"
  );
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// File paths for export/import workflow
const EXPORT_FILE = path.join(process.cwd(), "descriptions-todo.json");
const IMPORT_FILE = path.join(process.cwd(), "descriptions-generated.json");

interface ExportLocation {
  id: string;
  name: string;
  type: string;
  city: string;
  prefecture: string | null;
  rating: number | null;
  reviewCount: number | null;
  duration: string | null;
  priceLevel: number | null;
}

interface ImportDescription {
  id: string;
  description: string;
}

/**
 * Show status of locations needing descriptions
 */
async function showStatus(): Promise<void> {
  console.log("\n=== Description Status ===\n");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get total count
  const { count: totalCount, error: totalError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  if (totalError) {
    console.error("Failed to get total count:", totalError);
    process.exit(1);
  }

  // Get count with descriptions
  const { count: withDescCount, error: withDescError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .not("short_description", "is", null);

  if (withDescError) {
    console.error("Failed to get description count:", withDescError);
    process.exit(1);
  }

  // Get count without descriptions
  const { count: withoutDescCount, error: withoutDescError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .is("short_description", null);

  if (withoutDescError) {
    console.error("Failed to get count without descriptions:", withoutDescError);
    process.exit(1);
  }

  const total = totalCount || 0;
  const withDesc = withDescCount || 0;
  const withoutDesc = withoutDescCount || 0;
  const percentage = total > 0 ? Math.round((withDesc / total) * 100) : 0;

  console.log(`Total locations:        ${total.toLocaleString()}`);
  console.log(`With descriptions:      ${withDesc.toLocaleString()} (${percentage}%)`);
  console.log(`Needing descriptions:   ${withoutDesc.toLocaleString()}`);

  // Check for pending export/import files
  console.log("\n--- File Status ---");
  if (fs.existsSync(EXPORT_FILE)) {
    const data = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf-8"));
    console.log(`Export file exists:     ${data.length} locations pending`);
  } else {
    console.log(`Export file:            Not found`);
  }

  if (fs.existsSync(IMPORT_FILE)) {
    const data = JSON.parse(fs.readFileSync(IMPORT_FILE, "utf-8"));
    console.log(`Import file exists:     ${data.length} descriptions ready`);
  } else {
    console.log(`Import file:            Not found`);
  }

  console.log("\n--- Next Steps ---");
  if (withoutDesc > 0) {
    console.log(`1. Export:  npm run generate:descriptions -- --export --limit 50`);
    console.log(`2. Generate: Ask Claude Code to generate descriptions from descriptions-todo.json`);
    console.log(`3. Import:  npm run generate:descriptions -- --import`);
  } else {
    console.log("All locations have descriptions!");
  }
}

/**
 * Export locations needing descriptions to JSON file
 */
async function exportLocations(limit?: number): Promise<void> {
  console.log("\n=== Exporting Locations ===\n");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch locations without descriptions
  let query = supabase
    .from("locations")
    .select(
      "id, name, category, city, prefecture, rating, review_count, estimated_duration, price_level, google_primary_type"
    )
    .is("short_description", null)
    .order("review_count", { ascending: false, nullsFirst: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: locations, error } = await query;

  if (error) {
    console.error("Failed to fetch locations:", error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log("No locations need descriptions!");
    return;
  }

  // Transform to export format
  const exportData: ExportLocation[] = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    type: loc.google_primary_type || loc.category,
    city: loc.city,
    prefecture: loc.prefecture,
    rating: loc.rating,
    reviewCount: loc.review_count,
    duration: loc.estimated_duration,
    priceLevel: loc.price_level,
  }));

  // Write to file
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(exportData, null, 2));

  console.log(`Exported ${exportData.length} locations to: ${EXPORT_FILE}`);
  console.log("\n--- Sample Locations ---");
  exportData.slice(0, 5).forEach((loc) => {
    console.log(`  - ${loc.name} (${loc.city}, ${loc.type})`);
  });

  console.log("\n--- Next Step ---");
  console.log("Ask Claude Code to generate descriptions:");
  console.log('  "Generate descriptions for the locations in descriptions-todo.json"');
}

/**
 * Import generated descriptions from JSON file
 */
async function importDescriptions(): Promise<void> {
  console.log("\n=== Importing Descriptions ===\n");

  if (!fs.existsSync(IMPORT_FILE)) {
    console.error(`Error: Import file not found: ${IMPORT_FILE}`);
    console.error("Generate descriptions first, then save them to this file.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

    // Validate description length
    if (item.description.length > 500) {
      console.warn(`Description too long for ${item.id}: ${item.description.length} chars`);
      errors.push({ id: item.id, error: "Description too long" });
      failed++;
      continue;
    }

    const { error } = await supabase
      .from("locations")
      .update({ short_description: item.description })
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
    errors.forEach((e) => console.log(`  ${e.id}: ${e.error}`));
  }

  // Clean up files after successful import
  if (successful > 0) {
    // Archive the import file
    const archivePath = path.join(
      process.cwd(),
      "scripts",
      `descriptions-imported-${new Date().toISOString().split("T")[0]}.json`
    );
    fs.renameSync(IMPORT_FILE, archivePath);
    console.log(`\nArchived import file to: ${archivePath}`);

    // Remove export file if it exists
    if (fs.existsSync(EXPORT_FILE)) {
      fs.unlinkSync(EXPORT_FILE);
      console.log(`Removed export file: ${EXPORT_FILE}`);
    }
  }

  console.log("\n--- Next Step ---");
  console.log("Check status: npm run generate:descriptions -- --status");
}

// Parse limit argument
let limit: number | undefined;
const limitArg = args.find((arg) => arg.startsWith("--limit"));
if (limitArg) {
  const limitValue = args[args.indexOf(limitArg) + 1];
  limit = limitValue ? parseInt(limitValue, 10) : undefined;
}

// Run appropriate mode
async function main(): Promise<void> {
  if (isStatusMode) {
    await showStatus();
  } else if (isExportMode) {
    await exportLocations(limit);
  } else if (isImportMode) {
    await importDescriptions();
  } else {
    console.log("Usage:");
    console.log("  npm run generate:descriptions -- --status              # Show status");
    console.log("  npm run generate:descriptions -- --export --limit 50   # Export locations");
    console.log("  npm run generate:descriptions -- --import              # Import descriptions");
  }
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
