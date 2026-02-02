#!/usr/bin/env tsx
/**
 * Guide Generation Script
 *
 * Generates and manages AI-generated travel guides for testing.
 *
 * Usage:
 *   npx tsx scripts/generate-guides.ts --export          # Export templates with location data
 *   npx tsx scripts/generate-guides.ts --import <file>   # Import guides from JSON file
 *   npx tsx scripts/generate-guides.ts --list            # List all guides in database
 *   npx tsx scripts/generate-guides.ts --delete <id>     # Delete a specific guide
 *   npx tsx scripts/generate-guides.ts --clear           # Clear all guides (use with caution)
 *
 * Workflow:
 *   1. Run with --export to generate templates with location data
 *   2. Use Claude to generate guide content based on templates
 *   3. Save output to guides.json
 *   4. Run with --import guides.json to insert into database
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Verify required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Types
interface GuideInput {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  body: string;
  featured_image: string;
  thumbnail_image?: string;
  guide_type: "itinerary" | "listicle" | "deep_dive" | "seasonal";
  tags: string[];
  city?: string;
  region?: string;
  location_ids: string[];
  reading_time_minutes?: number;
  author?: string;
  status: "draft" | "published";
  featured?: boolean;
  sort_order?: number;
  published_at?: string;
}

interface LocationData {
  id: string;
  name: string;
  city: string;
  region: string;
  category: string;
  short_description?: string;
}

// Guide templates for export
const GUIDE_TEMPLATES = [
  // Kyoto
  { city: "Kyoto", region: "Kansai", title: "3 Things to Do in Kyoto", type: "listicle" as const },
  { city: "Kyoto", region: "Kansai", title: "Hidden Gems in Kyoto", type: "listicle" as const },
  { city: "Kyoto", region: "Kansai", title: "Essential Kyoto Temples", type: "deep_dive" as const },
  { city: "Kyoto", region: "Kansai", title: "Autumn Leaves in Kyoto", type: "seasonal" as const },

  // Tokyo
  { city: "Tokyo", region: "Kanto", title: "3 Things to Do in Tokyo", type: "listicle" as const },
  { city: "Tokyo", region: "Kanto", title: "Tokyo Food Tour", type: "itinerary" as const },

  // Osaka
  { city: "Osaka", region: "Kansai", title: "3 Things to Do in Osaka", type: "listicle" as const },
  { city: "Osaka", region: "Kansai", title: "Osaka Street Food Guide", type: "deep_dive" as const },

  // Hiroshima
  { city: "Hiroshima", region: "Chugoku", title: "Hidden Gems in Hiroshima", type: "listicle" as const },
  { city: "Hiroshima", region: "Chugoku", title: "Perfect Day in Hiroshima", type: "itinerary" as const },

  // Day Trips / Other Cities
  { city: "Nara", region: "Kansai", title: "Perfect Day Trip to Nara", type: "itinerary" as const },
  { city: "Kanazawa", region: "Chubu", title: "Hidden Gems in Kanazawa", type: "listicle" as const },
  { city: "Kobe", region: "Kansai", title: "Kobe Food Guide", type: "deep_dive" as const },
  { city: "Fukuoka", region: "Kyushu", title: "Weekend in Fukuoka", type: "itinerary" as const },

  // Regional Guides
  { region: "Kansai", title: "Best Cherry Blossom Spots in Kansai", type: "seasonal" as const },
  { region: "Kansai", title: "Kansai for First-Timers", type: "itinerary" as const },
];

// Parse command line arguments
const args = process.argv.slice(2);
const exportMode = args.includes("--export");
const importIndex = args.indexOf("--import");
const listMode = args.includes("--list");
const deleteIndex = args.indexOf("--delete");
const clearMode = args.includes("--clear");

/**
 * Validate location IDs exist in the database
 */
async function validateLocationIds(locationIds: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  if (locationIds.length === 0) {
    return { valid: [], invalid: [] };
  }

  const { data } = await supabase
    .from("locations")
    .select("id")
    .in("id", locationIds);

  const foundIds = new Set(data?.map((loc) => loc.id) || []);
  return {
    valid: locationIds.filter((id) => foundIds.has(id)),
    invalid: locationIds.filter((id) => !foundIds.has(id)),
  };
}

/**
 * Fetch locations for a city
 */
async function fetchLocationsForCity(city: string, limit: number = 10): Promise<LocationData[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, region, category, short_description")
    .ilike("city", city)
    .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
    .not("primary_photo_url", "is", null)
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Fetch locations for a region
 */
async function fetchLocationsForRegion(region: string, limit: number = 15): Promise<LocationData[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, region, category, short_description")
    .ilike("region", region)
    .or("business_status.is.null,business_status.neq.PERMANENTLY_CLOSED")
    .not("primary_photo_url", "is", null)
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Export templates with location data for AI generation
 */
async function exportTemplates(): Promise<void> {
  console.log("\n=== Exporting Guide Templates ===\n");

  const templates: Array<{
    template: typeof GUIDE_TEMPLATES[0];
    locations: LocationData[];
  }> = [];

  for (const template of GUIDE_TEMPLATES) {
    const locations = template.city
      ? await fetchLocationsForCity(template.city)
      : await fetchLocationsForRegion(template.region!);

    templates.push({ template, locations });
    console.log(`✓ ${template.title}: ${locations.length} locations found`);
  }

  // Output the templates
  console.log("\n=== GUIDE GENERATION PROMPT ===\n");
  console.log(`Please generate travel guide content for each of the following templates.

For each guide, output a JSON object with these fields:
- id: slug based on title (e.g., "3-things-to-do-in-kyoto")
- title: The guide title
- subtitle: Optional catchy subtitle
- summary: 1-2 sentence summary for cards (max 200 chars)
- body: Full markdown content with the guide article (500-1000 words)
- featured_image: Use a placeholder like "https://images.unsplash.com/photo-kyoto-1" (we'll update with real URLs)
- guide_type: "${["itinerary", "listicle", "deep_dive", "seasonal"].join('" | "')}"
- tags: Array of relevant tags
- city: Primary city (lowercase)
- region: Region name
- location_ids: Array of location IDs to link (pick 3-5 from the available locations)
- reading_time_minutes: Estimated reading time
- author: "Koku Travel"
- status: "published"
- featured: true for first 3-4 guides
- sort_order: 0-based index
- published_at: "${new Date().toISOString()}"

Output as a JSON array that can be directly imported.

=== TEMPLATES AND AVAILABLE LOCATIONS ===
`);

  for (const { template, locations } of templates) {
    console.log(`\n--- ${template.title} (${template.type}) ---`);
    console.log(`City: ${template.city || "N/A"} | Region: ${template.region}`);
    console.log("Available locations:");
    for (const loc of locations.slice(0, 10)) {
      console.log(`  - [${loc.id}] ${loc.name} (${loc.category})`);
      if (loc.short_description) {
        console.log(`    ${loc.short_description.slice(0, 100)}...`);
      }
    }
  }

  console.log("\n=== END OF TEMPLATES ===\n");
}

/**
 * Import guides from a JSON file
 */
async function importGuides(filePath: string): Promise<void> {
  console.log(`\n=== Importing from: ${filePath} ===\n`);

  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const guides: GuideInput[] = JSON.parse(content);

  console.log(`Found ${guides.length} guides to import\n`);

  // Collect all location IDs from guides
  const allLocationIds = new Set<string>();
  for (const guide of guides) {
    for (const id of guide.location_ids || []) {
      allLocationIds.add(id);
    }
  }

  // Validate location IDs
  if (allLocationIds.size > 0) {
    console.log(`Validating ${allLocationIds.size} location IDs...`);
    const { valid, invalid } = await validateLocationIds(Array.from(allLocationIds));

    if (invalid.length > 0) {
      console.log(`\n⚠️  Warning: ${invalid.length} invalid location ID(s) found:`);
      for (const id of invalid) {
        console.log(`   - ${id}`);
      }
      console.log("");
    }

    if (valid.length > 0) {
      console.log(`✓ ${valid.length} valid location ID(s)\n`);
    }
  }

  let successCount = 0;
  let errorCount = 0;

  for (const guide of guides) {
    // Set defaults
    if (!guide.status) guide.status = "published";
    if (!guide.author) guide.author = "Koku Travel";
    if (!guide.published_at && guide.status === "published") {
      guide.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("guides")
      .upsert(guide, { onConflict: "id" })
      .select("id, title");

    if (error) {
      console.error(`✗ Failed: ${guide.title} - ${error.message}`);
      errorCount++;
    } else {
      console.log(`✓ Imported: ${guide.title} (${data[0].id})`);
      successCount++;
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Success: ${successCount}, Failed: ${errorCount}`);
}

/**
 * List all guides in database
 */
async function listGuides(): Promise<void> {
  console.log("\n=== Guides in Database ===\n");

  const { data, error } = await supabase
    .from("guides")
    .select("id, title, guide_type, city, region, status, featured, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch guides:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No guides found in database.");
    return;
  }

  console.log(`Found ${data.length} guides:\n`);

  for (const guide of data) {
    const featured = guide.featured ? " ⭐" : "";
    console.log(`[${guide.status}] ${guide.title}${featured}`);
    console.log(`   ID: ${guide.id}`);
    console.log(`   Type: ${guide.guide_type} | City: ${guide.city || "N/A"} | Region: ${guide.region || "N/A"}`);
    console.log("");
  }
}

/**
 * Delete a specific guide
 */
async function deleteGuide(id: string): Promise<void> {
  console.log(`\n=== Deleting Guide: ${id} ===\n`);

  const { error } = await supabase
    .from("guides")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Failed to delete: ${error.message}`);
    process.exit(1);
  }

  console.log(`✓ Deleted guide: ${id}`);
}

/**
 * Clear all guides (with confirmation)
 */
async function clearAllGuides(): Promise<void> {
  console.log("\n=== Clearing All Guides ===\n");

  // Count first
  const { count } = await supabase
    .from("guides")
    .select("*", { count: "exact", head: true });

  if (!count || count === 0) {
    console.log("No guides to delete.");
    return;
  }

  console.log(`WARNING: This will delete ${count} guides.`);
  console.log("Run with --clear --confirm to proceed.\n");

  if (!args.includes("--confirm")) {
    return;
  }

  const { error } = await supabase
    .from("guides")
    .delete()
    .neq("id", "___nonexistent___"); // Delete all

  if (error) {
    console.error(`Failed to clear: ${error.message}`);
    process.exit(1);
  }

  console.log(`✓ Deleted ${count} guides`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  if (exportMode) {
    await exportTemplates();
  } else if (importIndex !== -1 && args[importIndex + 1]) {
    await importGuides(args[importIndex + 1]);
  } else if (listMode) {
    await listGuides();
  } else if (deleteIndex !== -1 && args[deleteIndex + 1]) {
    await deleteGuide(args[deleteIndex + 1]);
  } else if (clearMode) {
    await clearAllGuides();
  } else {
    console.log(`
Guide Generation Script

Usage:
  npx tsx scripts/generate-guides.ts --export          # Export templates with location data
  npx tsx scripts/generate-guides.ts --import <file>   # Import guides from JSON file
  npx tsx scripts/generate-guides.ts --list            # List all guides in database
  npx tsx scripts/generate-guides.ts --delete <id>     # Delete a specific guide
  npx tsx scripts/generate-guides.ts --clear           # Clear all guides (use with caution)

Workflow:
  1. npx tsx scripts/generate-guides.ts --export > templates.txt
  2. Use Claude to generate guide content based on templates
  3. Save output to guides.json
  4. npx tsx scripts/generate-guides.ts --import guides.json
    `);
  }
}

main().catch(console.error);
