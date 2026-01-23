#!/usr/bin/env tsx
/**
 * AI Description Generator Script
 *
 * Generates engaging, editorial-style descriptions for locations using Claude Code.
 * Descriptions are stored in the `short_description` database column for display
 * on explore cards and itinerary cards.
 *
 * Usage (Claude Code workflow):
 *   npm run generate:descriptions -- --status              # Show how many need descriptions
 *   npm run generate:descriptions -- --export --limit 50   # Export 50 locations to JSON
 *   npm run generate:descriptions -- --import              # Import generated descriptions
 *
 * Legacy usage (Anthropic API):
 *   npm run generate:descriptions -- --dry-run             # Preview prompts without calling API
 *   npm run generate:descriptions -- --test                # Process only 10 locations
 *   npm run generate:descriptions -- --limit 100           # Process 100 locations
 *   npm run generate:descriptions -- --skip-enriched       # Skip locations with descriptions
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
const isDryRun = args.includes("--dry-run");
const isLegacyMode = !isExportMode && !isImportMode && !isStatusMode;

// Verify required environment variables
if (!process.env.ANTHROPIC_API_KEY && isLegacyMode && !isDryRun) {
  console.error(
    "Error: ANTHROPIC_API_KEY must be configured in .env.local for legacy mode"
  );
  console.error(
    "Tip: Use --export/--import workflow with Claude Code instead (no API key required)"
  );
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL must be configured in .env.local"
  );
  process.exit(1);
}

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// File paths for export/import workflow
const EXPORT_FILE = path.join(process.cwd(), "descriptions-todo.json");
const IMPORT_FILE = path.join(process.cwd(), "descriptions-generated.json");

// Rate limiting configuration
const RATE_LIMIT_MS = 200; // 200ms between requests (5 req/sec)

// Claude configuration
const MODEL = "claude-3-5-haiku-20241022";
const MAX_TOKENS = 100;

interface LocationRow {
  id: string;
  name: string;
  category: string;
  city: string;
  prefecture: string | null;
  rating: number | null;
  review_count: number | null;
  estimated_duration: string | null;
  min_budget: string | null;
  price_level: number | null;
  google_primary_type: string | null;
  google_types: string[] | null;
  short_description: string | null;
}

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

interface GenerationResult {
  id: string;
  name: string;
  success: boolean;
  description?: string;
  prompt?: string;
  error?: string;
}

interface GenerationLog {
  timestamp: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  results: GenerationResult[];
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format price level as dollar signs
 */
function formatPriceLevel(priceLevel: number | null): string {
  if (priceLevel === null || priceLevel === 0) return "";
  return "$".repeat(Math.min(priceLevel, 4));
}

/**
 * Build the prompt for generating a description
 */
function buildPrompt(location: LocationRow): string {
  const type = location.google_primary_type || location.category;
  const rating = location.rating
    ? `${location.rating.toFixed(1)}/5 (${location.review_count?.toLocaleString() || "N/A"} reviews)`
    : "N/A";
  const duration = location.estimated_duration || "N/A";
  const price = formatPriceLevel(location.price_level);

  let prompt = `Write a 1-2 sentence description for this Japan travel destination in an editorial travel guide style.

Location: ${location.name}
Type: ${type}
City: ${location.city}${location.prefecture ? `, ${location.prefecture}` : ""}
Rating: ${rating}
Duration: ${duration}`;

  if (price) {
    prompt += `\nPrice: ${price}`;
  }

  prompt += `

Guidelines:
- Write like Lonely Planet or a professional travel guide
- Be specific about what makes this place notable
- Include Japanese terms naturally where appropriate (e.g., "torii gates", "matcha")
- Keep under 160 characters
- Use present tense, active voice
- No generic phrases like "must-visit" or "hidden gem"

Respond with ONLY the description, no quotes or additional text.`;

  return prompt;
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

/**
 * Generate a description using Claude API (legacy mode)
 */
async function generateDescription(
  client: Anthropic,
  location: LocationRow
): Promise<string | null> {
  const prompt = buildPrompt(location);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract text from response
    const content = response.content[0];
    if (content.type === "text") {
      // Clean up the response - remove quotes if present
      let description = content.text.trim();
      if (
        (description.startsWith('"') && description.endsWith('"')) ||
        (description.startsWith("'") && description.endsWith("'"))
      ) {
        description = description.slice(1, -1);
      }
      return description;
    }

    return null;
  } catch (error) {
    console.error(`API error for ${location.name}:`, error);
    return null;
  }
}

/**
 * Main generation function (legacy mode with Anthropic API)
 */
async function generateDescriptions(options: {
  dryRun: boolean;
  limit?: number;
  skipEnriched: boolean;
}): Promise<void> {
  const { dryRun, limit, skipEnriched } = options;

  console.log("\n=== AI Description Generator (Legacy Mode) ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no API calls or changes)" : "LIVE"}`);
  console.log(`Skip already enriched: ${skipEnriched}`);
  if (limit) console.log(`Limit: ${limit} locations`);
  console.log(`Model: ${MODEL}`);
  console.log("");

  // Initialize clients
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Only initialize Anthropic client if not in dry-run mode
  const anthropic = dryRun
    ? null
    : new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });

  // Fetch locations that need descriptions
  let query = supabase
    .from("locations")
    .select(
      "id, name, category, city, prefecture, rating, review_count, estimated_duration, min_budget, price_level, google_primary_type, google_types, short_description"
    )
    .order("review_count", { ascending: false, nullsFirst: false });

  if (skipEnriched) {
    query = query.is("short_description", null);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: locations, error } = await query;

  if (error) {
    console.error("Failed to fetch locations:", error);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.log("No locations to process.");
    return;
  }

  console.log(`Found ${locations.length} locations to process`);
  console.log("");

  const results: GenerationResult[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i] as LocationRow;

    // Progress indicator
    if ((i + 1) % 50 === 0 || i === 0) {
      const percent = Math.round(((i + 1) / locations.length) * 100);
      console.log(`Progress: ${i + 1}/${locations.length} (${percent}%)`);
    }

    // Skip if already has description and skipEnriched is true
    if (skipEnriched && location.short_description) {
      results.push({
        id: location.id,
        name: location.name,
        success: true,
        description: location.short_description,
        error: "Skipped - already has description",
      });
      skipped++;
      continue;
    }

    // Build prompt
    const prompt = buildPrompt(location);

    // In dry run mode, just show the prompt for first few
    if (dryRun) {
      if (i < 5) {
        console.log(`\n--- ${location.name} ---`);
        console.log(prompt);
        console.log("---");
      }
      results.push({
        id: location.id,
        name: location.name,
        success: true,
        prompt,
      });
      successful++;
      continue;
    }

    // Rate limiting
    if (i > 0) {
      await delay(RATE_LIMIT_MS);
    }

    // Generate description (anthropic client is guaranteed to be non-null here since we're not in dry-run)
    const description = await generateDescription(anthropic!, location);

    if (!description) {
      results.push({
        id: location.id,
        name: location.name,
        success: false,
        error: "API call failed or empty response",
      });
      failed++;
      continue;
    }

    // Update database
    const { error: updateError } = await supabase
      .from("locations")
      .update({ short_description: description })
      .eq("id", location.id);

    if (updateError) {
      results.push({
        id: location.id,
        name: location.name,
        success: false,
        description,
        error: updateError.message,
      });
      failed++;
      continue;
    }

    // Log success
    results.push({
      id: location.id,
      name: location.name,
      success: true,
      description,
    });
    successful++;

    // Log some examples
    if (i < 10 || i % 100 === 0) {
      console.log(`  ✓ ${location.name}: "${description.slice(0, 80)}..."`);
    }
  }

  // Summary
  console.log("\n=== Generation Summary ===");
  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);

  // Write log file
  const logFile: GenerationLog = {
    timestamp: new Date().toISOString(),
    totalProcessed: results.length,
    successful,
    failed,
    skipped,
    results,
  };

  const logPath = path.join(
    process.cwd(),
    "scripts",
    `ai-descriptions-log-${new Date().toISOString().split("T")[0]}.json`
  );
  fs.writeFileSync(logPath, JSON.stringify(logFile, null, 2));
  console.log(`\nLog written to: ${logPath}`);

  if (dryRun) {
    console.log(
      "\n[DRY RUN] No API calls were made and no changes applied. Run without --dry-run to generate descriptions."
    );
  }
}

// Parse command line arguments
const testMode = args.includes("--test");
const skipEnriched = args.includes("--skip-enriched");

let limit: number | undefined;
if (testMode) {
  limit = 10;
} else {
  const limitArg = args.find((arg) => arg.startsWith("--limit"));
  if (limitArg) {
    const limitValue = args[args.indexOf(limitArg) + 1];
    limit = limitValue ? parseInt(limitValue, 10) : undefined;
  }
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
    // Legacy mode - direct API generation
    await generateDescriptions({ dryRun: isDryRun, limit, skipEnriched });
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
