#!/usr/bin/env tsx
/**
 * Travel Guidance Extraction Script
 *
 * Extracts responsible travel tips from web URLs using AI assistance.
 * The script fetches content from URLs and structures them for database insertion.
 *
 * Usage:
 *   npx tsx scripts/extract-guidance.ts --url "https://example.com/etiquette"
 *   npx tsx scripts/extract-guidance.ts --import guidance-tips.json
 *   npx tsx scripts/extract-guidance.ts --seed   # Seeds predefined tips
 *   npx tsx scripts/extract-guidance.ts --list   # List all tips in database
 *
 * Workflow for URL extraction:
 *   1. Run with --url to fetch and display page content
 *   2. The script outputs structured prompts for Claude to process
 *   3. Review generated tips and save to JSON file
 *   4. Run with --import to insert into database
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

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
interface TravelGuidanceInput {
  title: string;
  summary: string;
  content?: string;
  icon?: string;
  guidance_type: "etiquette" | "practical" | "environmental" | "seasonal";
  tags: string[];
  categories: string[];
  regions: string[];
  cities: string[];
  location_ids: string[];
  seasons: string[];
  is_universal: boolean;
  priority: number;
  source_name?: string;
  source_url?: string;
  status: "draft" | "published";
}

// Parse command line arguments
const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const importIndex = args.indexOf("--import");
const seedMode = args.includes("--seed");
const listMode = args.includes("--list");

/**
 * Fetch content from a URL
 */
async function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KokuTravel/1.0; +https://koku.travel)",
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * Extract text content from HTML (basic extraction)
 */
function extractText(html: string): string {
  // Remove scripts and styles
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Limit length
  return text.slice(0, 10000);
}

/**
 * Display extraction prompt for manual AI processing
 */
async function processUrl(url: string): Promise<void> {
  console.log(`\n=== Fetching: ${url} ===\n`);

  try {
    const html = await fetchUrl(url);
    const text = extractText(html);

    console.log("=== PAGE CONTENT (first 3000 chars) ===\n");
    console.log(text.slice(0, 3000));
    console.log("\n...\n");

    console.log("=== AI EXTRACTION PROMPT ===\n");
    console.log(`Please extract travel etiquette tips from the following content. For each tip, provide a JSON object with these fields:

- title: Short, actionable title (max 50 chars)
- summary: Brief description (max 200 chars) explaining what to do or not do
- guidance_type: One of "etiquette", "practical", "environmental", "seasonal"
- icon: An emoji representing the tip
- categories: Array of location categories this applies to (e.g., ["temple", "shrine"], ["restaurant", "food"], ["transit", "train"], ["general"])
- cities: Array of specific cities if location-specific (empty for universal tips)
- tags: Keywords for matching (e.g., ["bowing", "greeting"], ["chopsticks", "dining"])
- priority: 1-10 (10 = most important)
- is_universal: true if applies everywhere, false if category/location specific

Source URL: ${url}

Content to extract from:
${text.slice(0, 5000)}

Output as a JSON array of tips.`);

  } catch (error) {
    console.error("Failed to fetch URL:", error);
  }
}

/**
 * Import tips from a JSON file
 */
async function importTips(filePath: string): Promise<void> {
  console.log(`\n=== Importing from: ${filePath} ===\n`);

  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const tips: TravelGuidanceInput[] = JSON.parse(content);

  console.log(`Found ${tips.length} tips to import\n`);

  for (const tip of tips) {
    // Ensure status is set
    if (!tip.status) {
      tip.status = "published";
    }

    const { data, error } = await supabase
      .from("travel_guidance")
      .insert(tip)
      .select("id, title");

    if (error) {
      console.error(`Failed to insert "${tip.title}":`, error.message);
    } else {
      console.log(`✓ Inserted: ${tip.title} (${data[0].id})`);
    }
  }

  console.log("\n=== Import complete ===");
}

/**
 * List all tips in database
 */
async function listTips(): Promise<void> {
  console.log("\n=== Travel Guidance Tips in Database ===\n");

  const { data, error } = await supabase
    .from("travel_guidance")
    .select("id, title, summary, guidance_type, categories, status, priority")
    .order("priority", { ascending: false });

  if (error) {
    console.error("Failed to fetch tips:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No tips found in database.");
    return;
  }

  console.log(`Found ${data.length} tips:\n`);

  for (const tip of data) {
    console.log(`[${tip.status}] ${tip.title}`);
    console.log(`   Type: ${tip.guidance_type} | Priority: ${tip.priority}`);
    console.log(`   Categories: ${tip.categories.join(", ") || "universal"}`);
    console.log(`   ${tip.summary.slice(0, 100)}...`);
    console.log("");
  }
}

/**
 * Seed predefined travel guidance tips
 */
async function seedTips(): Promise<void> {
  console.log("\n=== Seeding Travel Guidance Tips ===\n");

  const tips: TravelGuidanceInput[] = [
    // Temple/Shrine Etiquette
    {
      title: "Bow at Torii Gates",
      summary: "Bow once before passing through torii gates at shrines. The center of the path is reserved for the gods - walk along the sides.",
      icon: "⛩️",
      guidance_type: "etiquette",
      tags: ["torii", "gate", "bowing", "entrance"],
      categories: ["shrine"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 8,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "Purify at Temizuya",
      summary: "Cleanse your hands and mouth at the water basin before entering shrine grounds. Left hand first, then right, then rinse mouth (without touching ladle to lips).",
      icon: "🚰",
      guidance_type: "etiquette",
      tags: ["temizuya", "purification", "water", "ritual"],
      categories: ["shrine"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 9,
      source_name: "Japan-Guide",
      source_url: "https://www.japan-guide.com/",
      status: "published",
    },
    {
      title: "Remove Shoes Indoors",
      summary: "Always remove shoes when entering temple buildings, traditional restaurants, and ryokan. Look for a genkan (entryway) or shoe lockers.",
      icon: "👟",
      guidance_type: "etiquette",
      tags: ["shoes", "indoor", "genkan"],
      categories: ["temple", "shrine", "ryokan", "restaurant"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 9,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "No Photography in Main Halls",
      summary: "Photography is often prohibited inside main temple and shrine halls. Look for signs or ask staff before taking photos of Buddhist statues or sacred objects.",
      icon: "📵",
      guidance_type: "etiquette",
      tags: ["photography", "photos", "prohibited"],
      categories: ["temple", "shrine"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 8,
      source_name: "Japan-Guide",
      source_url: "https://www.japan-guide.com/",
      status: "published",
    },

    // Dining Etiquette
    {
      title: "Never Stick Chopsticks Upright",
      summary: "Placing chopsticks upright in rice resembles funeral incense rituals. Rest chopsticks on the holder or across your bowl when not eating.",
      icon: "🥢",
      guidance_type: "etiquette",
      tags: ["chopsticks", "rice", "dining", "taboo"],
      categories: ["restaurant", "food", "izakaya"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 9,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "Say Itadakimasu",
      summary: "Say 'itadakimasu' (I humbly receive) before eating and 'gochisousama' (thank you for the meal) after. Shows appreciation for the food and chef.",
      icon: "🙏",
      guidance_type: "etiquette",
      tags: ["itadakimasu", "greeting", "dining", "gratitude"],
      categories: ["restaurant", "food", "izakaya", "cafe"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 7,
      source_name: "Japan-Guide",
      source_url: "https://www.japan-guide.com/",
      status: "published",
    },
    {
      title: "No Tipping in Japan",
      summary: "Tipping is not customary and may cause confusion. Excellent service is expected as standard. Simply say thank you instead.",
      icon: "💴",
      guidance_type: "etiquette",
      tags: ["tipping", "payment", "service"],
      categories: ["restaurant", "food", "hotel", "taxi"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: true,
      priority: 8,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "Don't Pass Food Between Chopsticks",
      summary: "Passing food directly between chopsticks resembles a funeral ritual. Place food on a plate for others to pick up instead.",
      icon: "🥢",
      guidance_type: "etiquette",
      tags: ["chopsticks", "dining", "taboo", "sharing"],
      categories: ["restaurant", "food", "izakaya"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 8,
      source_name: "Japan-Guide",
      source_url: "https://www.japan-guide.com/",
      status: "published",
    },

    // Transit Etiquette
    {
      title: "Quiet on Trains",
      summary: "Keep phone conversations and loud chatter to a minimum on trains. Set phones to silent/manner mode. Shinkansen has designated quiet cars.",
      icon: "🤫",
      guidance_type: "etiquette",
      tags: ["train", "quiet", "phone", "manner"],
      categories: ["transit", "train", "subway"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 8,
      source_name: "JR",
      source_url: "https://www.jrpass.com/",
      status: "published",
    },
    {
      title: "Queue Lines on Platforms",
      summary: "Line up at marked waiting areas on train platforms. Let passengers exit before boarding. Don't rush or push.",
      icon: "🚉",
      guidance_type: "etiquette",
      tags: ["queue", "platform", "boarding", "waiting"],
      categories: ["transit", "train", "subway"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 7,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "Priority Seating Respect",
      summary: "Priority seats near train doors are for elderly, pregnant women, people with disabilities, and those with small children. Offer your seat when needed.",
      icon: "💺",
      guidance_type: "etiquette",
      tags: ["priority", "seating", "elderly", "accessibility"],
      categories: ["transit", "train", "subway", "bus"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 8,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },

    // General Cultural
    {
      title: "Speak Softly in Public",
      summary: "Maintain a quiet voice in public spaces, especially on trains and in museums. Loud conversations are considered impolite.",
      icon: "🔇",
      guidance_type: "etiquette",
      tags: ["quiet", "voice", "public", "manner"],
      categories: [],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: true,
      priority: 7,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "Bowing Basics",
      summary: "A slight bow (15°) is appropriate for casual greetings. Deeper bows show more respect. As a tourist, a small nod or bow is appreciated.",
      icon: "🙇",
      guidance_type: "etiquette",
      tags: ["bowing", "greeting", "respect"],
      categories: [],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: true,
      priority: 6,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },

    // Environmental
    {
      title: "Carry Your Trash",
      summary: "Public trash cans are rare in Japan. Carry a small bag for your trash until you find a bin at a convenience store or train station.",
      icon: "🗑️",
      guidance_type: "environmental",
      tags: ["trash", "garbage", "litter", "environment"],
      categories: [],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: true,
      priority: 9,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "No Walking While Eating",
      summary: "Eating while walking is generally frowned upon. Find a place to sit and enjoy your food, or eat at the vendor's stall.",
      icon: "🚶",
      guidance_type: "etiquette",
      tags: ["eating", "walking", "food", "street"],
      categories: ["market", "street_food"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 7,
      source_name: "Japan-Guide",
      source_url: "https://www.japan-guide.com/",
      status: "published",
    },

    // Location-Specific: Gion
    {
      title: "Respect Geiko Privacy",
      summary: "In Gion, do not approach, touch, or block geiko/maiko. Taking photos without permission is intrusive. Observe respectfully from a distance.",
      icon: "📸",
      guidance_type: "etiquette",
      tags: ["geiko", "maiko", "geisha", "photography", "privacy"],
      categories: ["landmark", "neighborhood"],
      regions: [],
      cities: ["kyoto"],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 10,
      source_name: "Kyoto Tourism",
      source_url: "https://kyoto.travel/en/",
      status: "published",
    },

    // Onsen Etiquette
    {
      title: "Wash Before Onsen",
      summary: "Always shower and wash thoroughly at the cleaning stations before entering the onsen bath. The bath is for soaking, not cleaning.",
      icon: "🛁",
      guidance_type: "etiquette",
      tags: ["onsen", "bathing", "washing", "hot spring"],
      categories: ["onsen", "spa", "ryokan"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 10,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
    {
      title: "Tattoo Policies Vary",
      summary: "Many onsen prohibit visible tattoos. Some offer private baths or cover-up patches. Check policies in advance or look for tattoo-friendly facilities.",
      icon: "🔖",
      guidance_type: "practical",
      tags: ["tattoo", "onsen", "policy", "hot spring"],
      categories: ["onsen", "spa"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 9,
      source_name: "Japan-Guide",
      source_url: "https://www.japan-guide.com/",
      status: "published",
    },
    {
      title: "Keep Towel Out of Water",
      summary: "Small modesty towels should not touch the bath water. Fold it on your head or place it on the bath edge while soaking.",
      icon: "🧴",
      guidance_type: "etiquette",
      tags: ["onsen", "towel", "bathing", "hot spring"],
      categories: ["onsen", "spa", "ryokan"],
      regions: [],
      cities: [],
      location_ids: [],
      seasons: [],
      is_universal: false,
      priority: 8,
      source_name: "JNTO",
      source_url: "https://www.japan.travel/en/",
      status: "published",
    },
  ];

  console.log(`Seeding ${tips.length} tips...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const tip of tips) {
    const { data, error } = await supabase
      .from("travel_guidance")
      .insert(tip)
      .select("id, title");

    if (error) {
      console.error(`✗ Failed: ${tip.title} - ${error.message}`);
      errorCount++;
    } else {
      console.log(`✓ Seeded: ${tip.title}`);
      successCount++;
    }
  }

  console.log(`\n=== Seed Complete ===`);
  console.log(`Success: ${successCount}, Failed: ${errorCount}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    await processUrl(args[urlIndex + 1]);
  } else if (importIndex !== -1 && args[importIndex + 1]) {
    await importTips(args[importIndex + 1]);
  } else if (seedMode) {
    await seedTips();
  } else if (listMode) {
    await listTips();
  } else {
    console.log(`
Travel Guidance Extraction Script

Usage:
  npx tsx scripts/extract-guidance.ts --url <url>      # Fetch URL and display extraction prompt
  npx tsx scripts/extract-guidance.ts --import <file>  # Import tips from JSON file
  npx tsx scripts/extract-guidance.ts --seed           # Seed predefined etiquette tips
  npx tsx scripts/extract-guidance.ts --list           # List all tips in database

Example workflow:
  1. npx tsx scripts/extract-guidance.ts --url "https://www.japan.travel/en/plan/etiquette-guide/"
  2. Copy the prompt and paste into Claude to generate structured tips
  3. Save Claude's output to tips.json
  4. npx tsx scripts/extract-guidance.ts --import tips.json
    `);
  }
}

main().catch(console.error);
