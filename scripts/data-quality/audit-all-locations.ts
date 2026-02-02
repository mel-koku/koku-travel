#!/usr/bin/env tsx
/**
 * Comprehensive audit of all location names and descriptions
 *
 * Checks for:
 * - Names that don't match their IDs (renamed locations)
 * - Addresses used as descriptions
 * - Truncated/incomplete descriptions
 * - Duplicate entries
 * - Generic/category-like names
 * - ALL CAPS names
 * - Mismatched name/description (event name with place description)
 */

import { config } from "dotenv";
config({ path: ".env.local", debug: false });

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface Issue {
  type: string;
  name: string;
  city: string;
  category: string;
  desc?: string;
  id: string;
  severity: "high" | "medium" | "low";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function auditLocations() {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, description, short_description, city, category, region, editorial_summary, rating, review_count")
    .order("name");

  if (error) {
    console.error("Failed to fetch locations:", error.message);
    process.exit(1);
  }

  const issues: Issue[] = [];

  for (const loc of data || []) {
    const name = loc.name || "";
    const desc = loc.description || "";
    const shortDesc = loc.short_description || "";
    const editorial = loc.editorial_summary || "";
    const id = loc.id || "";

    // Issue 1: ID doesn't match name (indicates renamed location)
    // This is INFORMATIONAL only - the name IS correct, just the ID is historical
    // IDs cannot be changed as they're used as foreign keys/URLs
    const expectedSlug = slugify(name);
    const idSlug = id.split("-").slice(0, -2).join("-"); // Remove region and hash suffix
    if (expectedSlug && idSlug && !idSlug.includes(expectedSlug.slice(0, 15)) && !expectedSlug.includes(idSlug.slice(0, 15))) {
      // Check if name is completely different from ID
      const idWords = idSlug.split("-").filter(w => w.length > 2);
      const nameWords = expectedSlug.split("-").filter(w => w.length > 2);
      const overlap = idWords.filter(w => nameWords.includes(w)).length;
      if (overlap < Math.min(idWords.length, nameWords.length) / 2) {
        issues.push({
          type: "NAME_ID_MISMATCH",
          name,
          city: loc.city,
          category: loc.category,
          desc: `ID: ${id} | Expected slug: ${expectedSlug}`,
          id,
          severity: "low" // Cosmetic only - name is correct, ID is historical artifact
        });
      }
    }

    // Issue 2: Description is just an address (postal code pattern)
    // Exclude descriptions that start with numbers but are actual content (like "138 Tower Park hosts...")
    const isJustAddress = /^〒?\d{3}[-]?\d{0,4}/.test(desc) || /^\d+-?\d*\s+\w+,?\s*(Ward|ku|cho|machi|町|区)/i.test(desc);
    const isActualContent = desc.length > 50 && /\.\s|hosts|features|offers|located|known for/i.test(desc);
    if (isJustAddress && !isActualContent) {
      issues.push({
        type: "ADDRESS_AS_DESC",
        name,
        city: loc.city,
        category: loc.category,
        desc: desc.slice(0, 100),
        id,
        severity: "high"
      });
    }

    // Issue 3: Description starts with lowercase (truncated/fragment)
    // Exclude known brand names that intentionally use lowercase (teamLab, iPhone, etc.)
    const knownLowercaseBrands = ["teamlab", "iphone", "ipad", "ebay", "reddit"];
    const firstWord = desc.trim().split(/\s+/)[0]?.toLowerCase() || "";
    const isIntentionalLowercase = knownLowercaseBrands.includes(firstWord);

    if (desc && /^[a-z]/.test(desc.trim()) && !isIntentionalLowercase) {
      issues.push({
        type: "TRUNCATED_DESC",
        name,
        city: loc.city,
        category: loc.category,
        desc: desc.slice(0, 100),
        id,
        severity: "medium"
      });
    }

    // Issue 4: Name starts with special character
    if (/^[-_\/\(\)]/.test(name)) {
      issues.push({
        type: "BAD_NAME_START",
        name,
        city: loc.city,
        category: loc.category,
        id,
        severity: "high"
      });
    }

    // Issue 5: Name is ALL CAPS (needs reformatting)
    if (name.length > 4 && name === name.toUpperCase() && /^[A-Z\s]+$/.test(name)) {
      issues.push({
        type: "ALL_CAPS_NAME",
        name,
        city: loc.city,
        category: loc.category,
        id,
        severity: "low"
      });
    }

    // Issue 6: Generic plural names (Sake Breweries, Ramen Shops, etc)
    if (/^[A-Z][a-z]+ (Breweries|Shops|Restaurants|Markets|Streets|Districts|Areas|Beaches|Hotspots|Bars|Cafes|Hotels)$/i.test(name)) {
      issues.push({
        type: "GENERIC_PLURAL_NAME",
        name,
        city: loc.city,
        category: loc.category,
        id,
        severity: "high"
      });
    }

    // Issue 7: Very short incomplete description
    if (desc && desc.length < 30 && !desc.endsWith(".")) {
      issues.push({
        type: "SHORT_INCOMPLETE_DESC",
        name,
        city: loc.city,
        category: loc.category,
        desc,
        id,
        severity: "medium"
      });
    }

    // Issue 8: Name is just "The X" or single generic word
    if (/^(The|A|An) [A-Z][a-z]+$/i.test(name) && name.split(" ").length === 2) {
      issues.push({
        type: "GENERIC_ARTICLE_NAME",
        name,
        city: loc.city,
        category: loc.category,
        id,
        severity: "medium"
      });
    }

    // Issue 9: Event/Festival name but category is not culture
    const isEventName = /(Festival|Matsuri|Illumination|Fair|Parade|Celebration|Fireworks|Hanami|Momiji)$/i.test(name);
    if (isEventName && !["culture", "nature"].includes(loc.category)) {
      issues.push({
        type: "EVENT_WRONG_CATEGORY",
        name,
        city: loc.city,
        category: loc.category,
        id,
        severity: "low"
      });
    }

    // Issue 10: Missing description for non-food categories
    if (!desc && !["food", "accommodation", "bar", "restaurant"].includes(loc.category)) {
      issues.push({
        type: "MISSING_DESC",
        name,
        city: loc.city,
        category: loc.category,
        id,
        severity: "medium"
      });
    }
  }

  // Check for duplicates
  const nameCount: Record<string, { count: number; ids: string[]; cities: string[]; categories: string[] }> = {};
  for (const loc of data || []) {
    const key = loc.name.toLowerCase();
    if (!nameCount[key]) {
      nameCount[key] = { count: 0, ids: [], cities: [], categories: [] };
    }
    nameCount[key].count++;
    nameCount[key].ids.push(loc.id);
    nameCount[key].cities.push(loc.city);
    nameCount[key].categories.push(loc.category);
  }

  for (const [name, info] of Object.entries(nameCount)) {
    if (info.count > 1) {
      const uniqueCities = [...new Set(info.cities)];
      // Same city duplicates are more problematic
      if (uniqueCities.length < info.count) {
        issues.push({
          type: "DUPLICATE_SAME_CITY",
          name: name,
          city: info.cities.join(", "),
          category: info.categories.join(", "),
          desc: `IDs: ${info.ids.join(", ")}`,
          id: info.ids[0],
          severity: "high"
        });
      } else if (info.count > 2) {
        // Many duplicates across cities might still be an issue
        issues.push({
          type: "DUPLICATE_MANY",
          name: name,
          city: info.cities.join(", "),
          category: info.categories.join(", "),
          desc: `IDs: ${info.ids.join(", ")}`,
          id: info.ids[0],
          severity: "low"
        });
      }
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Group and print
  const grouped: Record<string, Issue[]> = {};
  for (const issue of issues) {
    if (!grouped[issue.type]) grouped[issue.type] = [];
    grouped[issue.type].push(issue);
  }

  // Print by severity
  console.log("\n" + "=".repeat(60));
  console.log("HIGH SEVERITY ISSUES");
  console.log("=".repeat(60));

  for (const [type, items] of Object.entries(grouped)) {
    const highItems = items.filter(i => i.severity === "high");
    if (highItems.length === 0) continue;
    console.log(`\n--- ${type} (${highItems.length}) ---`);
    for (const item of highItems) {
      console.log(`  ${item.name} (${item.city}) [${item.category}]`);
      if (item.desc) console.log(`    ${item.desc.slice(0, 120)}`);
      console.log(`    ID: ${item.id}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("MEDIUM SEVERITY ISSUES");
  console.log("=".repeat(60));

  for (const [type, items] of Object.entries(grouped)) {
    const medItems = items.filter(i => i.severity === "medium");
    if (medItems.length === 0) continue;
    console.log(`\n--- ${type} (${medItems.length}) ---`);
    for (const item of medItems.slice(0, 10)) {
      console.log(`  ${item.name} (${item.city}) [${item.category}]`);
      if (item.desc) console.log(`    ${item.desc.slice(0, 100)}`);
      console.log(`    ID: ${item.id}`);
    }
    if (medItems.length > 10) {
      console.log(`  ... and ${medItems.length - 10} more`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("LOW SEVERITY ISSUES");
  console.log("=".repeat(60));

  for (const [type, items] of Object.entries(grouped)) {
    const lowItems = items.filter(i => i.severity === "low");
    if (lowItems.length === 0) continue;
    console.log(`\n--- ${type} (${lowItems.length}) ---`);
    for (const item of lowItems.slice(0, 5)) {
      console.log(`  ${item.name} (${item.city}) [${item.category}]`);
    }
    if (lowItems.length > 5) {
      console.log(`  ... and ${lowItems.length - 5} more`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total issues: ${issues.length}`);
  console.log(`  High severity: ${issues.filter(i => i.severity === "high").length}`);
  console.log(`  Medium severity: ${issues.filter(i => i.severity === "medium").length}`);
  console.log(`  Low severity: ${issues.filter(i => i.severity === "low").length}`);
  console.log("\nBy type:");
  for (const [type, items] of Object.entries(grouped)) {
    console.log(`  ${type}: ${items.length}`);
  }

  // Export high severity issues for fixing
  const highSeverity = issues.filter(i => i.severity === "high");
  if (highSeverity.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("LOCATIONS NEEDING FIXES (HIGH SEVERITY)");
    console.log("=".repeat(60));
    console.log(JSON.stringify(highSeverity.map(i => ({
      id: i.id,
      type: i.type,
      name: i.name,
      city: i.city
    })), null, 2));
  }
}

auditLocations().catch(console.error);
