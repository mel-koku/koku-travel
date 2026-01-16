#!/usr/bin/env tsx
/**
 * Generates simple descriptions for locations based on category and city.
 *
 * Usage:
 *   npx tsx scripts/generate-simple-descriptions.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { join } from "path";

// Category-based description templates
const CATEGORY_TEMPLATES: Record<string, string[]> = {
  culture: [
    "Cultural landmark in {city} showcasing traditional Japanese heritage.",
    "Historic cultural site in {city} offering insight into Japanese traditions.",
    "Cultural attraction in {city} celebrating local arts and history.",
  ],
  nature: [
    "Natural attraction in {city} featuring scenic landscapes and outdoor beauty.",
    "Scenic natural spot in {city} perfect for nature lovers.",
    "Beautiful natural area in {city} with stunning views and tranquil surroundings.",
  ],
  food: [
    "Popular dining destination in {city} known for local cuisine.",
    "Culinary hotspot in {city} offering authentic Japanese flavors.",
    "Food destination in {city} where visitors can enjoy regional specialties.",
  ],
  shopping: [
    "Shopping destination in {city} with a variety of local goods and souvenirs.",
    "Popular shopping area in {city} offering unique finds and local crafts.",
    "Retail destination in {city} perfect for finding authentic Japanese items.",
  ],
  attraction: [
    "Popular attraction in {city} offering memorable experiences for visitors.",
    "Must-visit destination in {city} with unique activities and sights.",
    "Visitor attraction in {city} providing engaging experiences.",
  ],
  temple: [
    "Historic temple in {city} featuring traditional Buddhist architecture.",
    "Sacred temple in {city} known for its spiritual significance and beauty.",
    "Ancient temple in {city} offering peaceful surroundings and cultural heritage.",
  ],
  shrine: [
    "Traditional Shinto shrine in {city} with beautiful grounds and architecture.",
    "Historic shrine in {city} dedicated to local deities and traditions.",
    "Sacred shrine in {city} offering a glimpse into Japanese spirituality.",
  ],
  museum: [
    "Museum in {city} showcasing art, history, and cultural exhibits.",
    "Cultural museum in {city} with fascinating collections and displays.",
    "Educational museum in {city} offering insights into local heritage.",
  ],
  park: [
    "Public park in {city} perfect for relaxation and outdoor activities.",
    "Scenic park in {city} with beautiful gardens and walking paths.",
    "Urban oasis in {city} offering green spaces and recreational areas.",
  ],
  beach: [
    "Beautiful beach in {city} with clear waters and sandy shores.",
    "Coastal destination in {city} ideal for swimming and sunbathing.",
    "Scenic beach in {city} perfect for relaxation by the sea.",
  ],
  onsen: [
    "Traditional hot spring in {city} offering relaxation and rejuvenation.",
    "Natural onsen in {city} known for its therapeutic mineral waters.",
    "Hot spring destination in {city} perfect for unwinding Japanese-style.",
  ],
  garden: [
    "Traditional Japanese garden in {city} with meticulously landscaped grounds.",
    "Beautiful garden in {city} showcasing Japanese landscaping artistry.",
    "Serene garden in {city} offering peaceful strolls and natural beauty.",
  ],
  castle: [
    "Historic castle in {city} representing feudal Japanese architecture.",
    "Ancient castle in {city} with impressive towers and fortifications.",
    "Landmark castle in {city} offering panoramic views and rich history.",
  ],
  festival: [
    "Traditional festival in {city} celebrating local culture and traditions.",
    "Annual celebration in {city} featuring parades, performances, and food.",
    "Cultural festival in {city} showcasing the region's heritage.",
  ],
  experience: [
    "Unique experience in {city} offering hands-on cultural activities.",
    "Interactive activity in {city} for an authentic Japanese experience.",
    "Memorable experience in {city} perfect for cultural immersion.",
  ],
};

// Default template for unknown categories
const DEFAULT_TEMPLATES = [
  "Popular destination in {city} worth visiting during your trip.",
  "Notable attraction in {city} offering unique experiences.",
  "Interesting spot in {city} for visitors to explore.",
];

function getDescription(name: string, category: string, city: string): string {
  // Normalize category
  const normalizedCategory = category.toLowerCase();

  // Check if name contains hints about the type
  const nameLower = name.toLowerCase();
  let templates = CATEGORY_TEMPLATES[normalizedCategory] || DEFAULT_TEMPLATES;

  // Override based on name keywords
  if (nameLower.includes("temple") || nameLower.includes("-ji")) {
    templates = CATEGORY_TEMPLATES.temple || templates;
  } else if (nameLower.includes("shrine") || nameLower.includes("jinja") || nameLower.includes("-gu")) {
    templates = CATEGORY_TEMPLATES.shrine || templates;
  } else if (nameLower.includes("museum")) {
    templates = CATEGORY_TEMPLATES.museum || templates;
  } else if (nameLower.includes("park")) {
    templates = CATEGORY_TEMPLATES.park || templates;
  } else if (nameLower.includes("beach")) {
    templates = CATEGORY_TEMPLATES.beach || templates;
  } else if (nameLower.includes("onsen") || nameLower.includes("hot spring")) {
    templates = CATEGORY_TEMPLATES.onsen || templates;
  } else if (nameLower.includes("garden")) {
    templates = CATEGORY_TEMPLATES.garden || templates;
  } else if (nameLower.includes("castle")) {
    templates = CATEGORY_TEMPLATES.castle || templates;
  } else if (nameLower.includes("festival") || nameLower.includes("matsuri")) {
    templates = CATEGORY_TEMPLATES.festival || templates;
  } else if (nameLower.includes("experience") || nameLower.includes("tour") || nameLower.includes("workshop")) {
    templates = CATEGORY_TEMPLATES.experience || templates;
  }

  // Select template based on hash of name for consistency
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const template = templates[hash % templates.length];

  return template.replace("{city}", city);
}

async function generateDescriptions() {
  console.log("=== Generating Simple Descriptions ===\n");

  const { getServiceRoleClient } = await import("@/lib/supabase/serviceRole");
  const supabase = getServiceRoleClient();

  // Load the list of locations needing descriptions
  const listPath = join(process.cwd(), "tmp", "locations-need-ai-descriptions.json");
  let needDescriptions: { id: string; name: string; category: string; city: string }[];

  try {
    needDescriptions = JSON.parse(readFileSync(listPath, "utf-8"));
  } catch {
    // If file doesn't exist, query database
    const { data } = await supabase
      .from("locations")
      .select("id, name, category, city, short_description")
      .or("short_description.is.null,short_description.eq.")
      .limit(1000);

    needDescriptions = (data || []).map(l => ({
      id: l.id,
      name: l.name,
      category: l.category,
      city: l.city,
    }));
  }

  console.log(`Generating descriptions for ${needDescriptions.length} locations\n`);

  let updated = 0;
  let failed = 0;

  for (const loc of needDescriptions) {
    const description = getDescription(loc.name, loc.category, loc.city);

    const { error } = await supabase
      .from("locations")
      .update({ short_description: description })
      .eq("id", loc.id);

    if (error) {
      failed++;
    } else {
      updated++;
      if (updated % 50 === 0) {
        console.log(`Updated ${updated}/${needDescriptions.length}...`);
      }
    }
  }

  console.log(`\n=== Summary ===\n`);
  console.log(`Total: ${needDescriptions.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  // Verify final count
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .or("short_description.is.null,short_description.eq.");

  console.log(`\nLocations still without descriptions: ${count || 0}`);
}

generateDescriptions()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
