/**
 * Audit script to identify and tag seasonal locations in the database.
 *
 * This script analyzes location names and descriptions to identify:
 * - Festivals (matsuri, hanabi, fire festival, etc.)
 * - Seasonal attractions (cherry blossoms, autumn leaves, etc.)
 * - Locations that may have seasonal closures
 *
 * Usage:
 *   npx tsx scripts/audit-seasonal-locations.ts              # Audit only
 *   npx tsx scripts/audit-seasonal-locations.ts --apply      # Apply changes to database
 *   npx tsx scripts/audit-seasonal-locations.ts --json       # Output as JSON
 *   npx tsx scripts/audit-seasonal-locations.ts --verbose    # Show all matches
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Known seasonal locations with their availability rules
// These are manually verified and ready to be applied
const KNOWN_SEASONAL_LOCATIONS: KnownSeasonalLocation[] = [
  {
    namePattern: /jidai matsuri/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 10,
      dayStart: 22,
      isAvailable: true,
      description: "Jidai Matsuri occurs annually on October 22",
    },
    city: "Kyoto",
  },
  {
    namePattern: /nagahama hikiyama/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 4,
      dayStart: 14,
      monthEnd: 4,
      dayEnd: 16,
      isAvailable: true,
      description: "Nagahama Hikiyama Festival occurs April 14-16",
    },
    city: "Nagahama",
  },
  {
    namePattern: /omihachiman sagicho|sagicho fire festival/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "floating_annual",
      monthStart: 3,
      weekOrdinal: 3,
      dayOfWeek: 6, // Saturday
      isAvailable: true,
      description: "Omihachiman Sagicho Fire Festival occurs on the 3rd weekend of March",
    },
    city: "Omihachiman",
  },
  {
    namePattern: /nada no kenka|kenka matsuri/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 10,
      dayStart: 14,
      monthEnd: 10,
      dayEnd: 15,
      isAvailable: true,
      description: "Nada no Kenka Festival occurs October 14-15",
    },
    city: "Himeji",
  },
  {
    namePattern: /mifune matsuri/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "floating_annual",
      monthStart: 5,
      weekOrdinal: 3,
      dayOfWeek: 0, // Sunday
      isAvailable: true,
      description: "Mifune Matsuri occurs on the 3rd Sunday of May",
    },
    city: "Kyoto",
  },
  {
    namePattern: /okera mairi/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 12,
      dayStart: 31,
      isAvailable: true,
      description: "Okera Mairi occurs on New Year's Eve (December 31)",
    },
    city: "Kyoto",
  },
  {
    namePattern: /yoshida fire festival|yoshida himatsuri/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 8,
      dayStart: 26,
      monthEnd: 8,
      dayEnd: 27,
      isAvailable: true,
      description: "Yoshida Fire Festival occurs August 26-27",
    },
    city: "Fujiyoshida",
  },
  {
    namePattern: /ako gishi-?sai/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 12,
      dayStart: 14,
      isAvailable: true,
      description: "Ako Gishi-sai occurs on December 14",
    },
    city: "Ako",
  },
  {
    namePattern: /marimo festival/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 10,
      dayStart: 8,
      monthEnd: 10,
      dayEnd: 10,
      isAvailable: true,
      description: "Marimo Festival occurs October 8-10",
    },
    city: "Kushiro",
  },
  {
    namePattern: /gion matsuri/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 7,
      dayStart: 1,
      monthEnd: 7,
      dayEnd: 31,
      isAvailable: true,
      description: "Gion Matsuri spans the entire month of July (main events July 14-17, 21-24)",
    },
    city: "Kyoto",
  },
  {
    namePattern: /tenjin matsuri/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 7,
      dayStart: 24,
      monthEnd: 7,
      dayEnd: 25,
      isAvailable: true,
      description: "Tenjin Matsuri occurs July 24-25",
    },
    city: "Osaka",
  },
  {
    namePattern: /nebuta matsuri|nebuta festival/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 8,
      dayStart: 2,
      monthEnd: 8,
      dayEnd: 7,
      isAvailable: true,
      description: "Nebuta Matsuri occurs August 2-7",
    },
    city: "Aomori",
  },
  {
    namePattern: /awa odori/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "fixed_annual",
      monthStart: 8,
      dayStart: 12,
      monthEnd: 8,
      dayEnd: 15,
      isAvailable: true,
      description: "Awa Odori occurs August 12-15",
    },
    city: "Tokushima",
  },
  {
    namePattern: /sapporo snow festival|yuki matsuri/i,
    seasonalType: "festival",
    availability: {
      availabilityType: "date_range",
      monthStart: 2,
      dayStart: 4,
      monthEnd: 2,
      dayEnd: 11,
      isAvailable: true,
      description: "Sapporo Snow Festival occurs in early February (typically Feb 4-11)",
    },
    city: "Sapporo",
  },
];

// Patterns for detecting potential seasonal locations
const FESTIVAL_PATTERNS = [
  /matsuri/i,
  /festival/i,
  /hanabi/i,
  /fireworks/i,
  /bon odori/i,
  /fire festival/i,
  /snow festival/i,
  /ice festival/i,
  /lantern festival/i,
];

const SEASONAL_ATTRACTION_PATTERNS = [
  /sakura/i,
  /cherry blossom/i,
  /hanami/i,
  /momiji/i,
  /autumn leaves/i,
  /koyo/i,
  /fall foliage/i,
  /plum blossom/i,
  /ume/i,
  /wisteria/i,
  /fuji/i, // wisteria
  /hydrangea/i,
  /ajisai/i,
  /illumination/i,
  /light-?up/i,
  /winter illumination/i,
];

const WINTER_CLOSURE_PATTERNS = [
  /alpine route/i,
  /tateyama/i,
  /mountain road/i,
  /winter closure/i,
];

interface LocationRecord {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  region: string | null;
  description: string | null;
  is_seasonal: boolean | null;
  seasonal_type: string | null;
}

interface AvailabilityRule {
  availabilityType: "fixed_annual" | "floating_annual" | "date_range";
  monthStart?: number;
  dayStart?: number;
  monthEnd?: number;
  dayEnd?: number;
  weekOrdinal?: number;
  dayOfWeek?: number;
  yearStart?: number;
  yearEnd?: number;
  isAvailable: boolean;
  description?: string;
}

interface KnownSeasonalLocation {
  namePattern: RegExp;
  seasonalType: "festival" | "seasonal_attraction" | "winter_closure";
  availability: AvailabilityRule;
  city?: string;
}

interface SeasonalCandidate {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  matchType: "known" | "festival" | "seasonal_attraction" | "winter_closure";
  seasonalType: "festival" | "seasonal_attraction" | "winter_closure";
  confidence: "high" | "medium" | "low";
  matchedPattern: string;
  knownAvailability?: AvailabilityRule;
}

async function fetchAllLocations(): Promise<LocationRecord[]> {
  const allLocations: LocationRecord[] = [];
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, category, city, region, description, is_seasonal, seasonal_type")
      .order("name", { ascending: true })
      .range(page * limit, (page + 1) * limit - 1);

    if (error) {
      console.error("Error fetching locations:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allLocations.push(...(data as LocationRecord[]));
    hasMore = data.length === limit;
    page++;

    if (page > 50) {
      console.warn("Reached pagination safety limit");
      break;
    }
  }

  return allLocations;
}

function detectSeasonalCandidates(locations: LocationRecord[]): SeasonalCandidate[] {
  const candidates: SeasonalCandidate[] = [];

  for (const location of locations) {
    // Skip already-tagged seasonal locations
    if (location.is_seasonal) {
      continue;
    }

    const searchText = `${location.name} ${location.description ?? ""}`;

    // Check known seasonal locations first (high confidence)
    for (const known of KNOWN_SEASONAL_LOCATIONS) {
      if (known.namePattern.test(location.name)) {
        // Optional city matching for more confidence
        if (known.city && location.city &&
            !location.city.toLowerCase().includes(known.city.toLowerCase())) {
          continue;
        }

        candidates.push({
          id: location.id,
          name: location.name,
          city: location.city,
          region: location.region,
          matchType: "known",
          seasonalType: known.seasonalType,
          confidence: "high",
          matchedPattern: known.namePattern.source,
          knownAvailability: known.availability,
        });
        break; // Only match one known pattern per location
      }
    }

    // Check if already matched as known
    if (candidates.some((c) => c.id === location.id)) {
      continue;
    }

    // Check festival patterns (medium confidence)
    for (const pattern of FESTIVAL_PATTERNS) {
      if (pattern.test(searchText)) {
        candidates.push({
          id: location.id,
          name: location.name,
          city: location.city,
          region: location.region,
          matchType: "festival",
          seasonalType: "festival",
          confidence: "medium",
          matchedPattern: pattern.source,
        });
        break;
      }
    }

    // Check if already matched
    if (candidates.some((c) => c.id === location.id)) {
      continue;
    }

    // Check seasonal attraction patterns (low confidence - needs review)
    for (const pattern of SEASONAL_ATTRACTION_PATTERNS) {
      if (pattern.test(searchText)) {
        candidates.push({
          id: location.id,
          name: location.name,
          city: location.city,
          region: location.region,
          matchType: "seasonal_attraction",
          seasonalType: "seasonal_attraction",
          confidence: "low",
          matchedPattern: pattern.source,
        });
        break;
      }
    }

    // Check if already matched
    if (candidates.some((c) => c.id === location.id)) {
      continue;
    }

    // Check winter closure patterns (medium confidence)
    for (const pattern of WINTER_CLOSURE_PATTERNS) {
      if (pattern.test(searchText)) {
        candidates.push({
          id: location.id,
          name: location.name,
          city: location.city,
          region: location.region,
          matchType: "winter_closure",
          seasonalType: "winter_closure",
          confidence: "medium",
          matchedPattern: pattern.source,
        });
        break;
      }
    }
  }

  return candidates;
}

function generateUpdateSQL(candidates: SeasonalCandidate[]): string {
  const lines: string[] = [
    "-- SQL to update seasonal locations",
    "-- Generated by audit-seasonal-locations.ts",
    `-- Generated at: ${new Date().toISOString()}`,
    "",
    "-- High confidence updates (known festivals with specific dates)",
    "",
  ];

  const highConfidence = candidates.filter((c) => c.confidence === "high");
  const mediumConfidence = candidates.filter((c) => c.confidence === "medium");
  const lowConfidence = candidates.filter((c) => c.confidence === "low");

  // Generate UPDATE statements for high confidence
  for (const candidate of highConfidence) {
    lines.push(`-- ${candidate.name} (${candidate.city ?? "Unknown city"})`);
    lines.push(`UPDATE locations SET is_seasonal = true, seasonal_type = '${candidate.seasonalType}' WHERE id = '${candidate.id}';`);

    if (candidate.knownAvailability) {
      const rule = candidate.knownAvailability;
      const columns = ["location_id", "availability_type", "is_available"];
      const values = [`'${candidate.id}'`, `'${rule.availabilityType}'`, rule.isAvailable.toString()];

      if (rule.monthStart !== undefined) {
        columns.push("month_start");
        values.push(rule.monthStart.toString());
      }
      if (rule.dayStart !== undefined) {
        columns.push("day_start");
        values.push(rule.dayStart.toString());
      }
      if (rule.monthEnd !== undefined) {
        columns.push("month_end");
        values.push(rule.monthEnd.toString());
      }
      if (rule.dayEnd !== undefined) {
        columns.push("day_end");
        values.push(rule.dayEnd.toString());
      }
      if (rule.weekOrdinal !== undefined) {
        columns.push("week_ordinal");
        values.push(rule.weekOrdinal.toString());
      }
      if (rule.dayOfWeek !== undefined) {
        columns.push("day_of_week");
        values.push(rule.dayOfWeek.toString());
      }
      if (rule.description) {
        columns.push("description");
        values.push(`'${rule.description.replace(/'/g, "''")}'`);
      }

      lines.push(`INSERT INTO location_availability (${columns.join(", ")}) VALUES (${values.join(", ")});`);
    }
    lines.push("");
  }

  lines.push("");
  lines.push("-- Medium confidence updates (need date verification)");
  lines.push("");

  for (const candidate of mediumConfidence) {
    lines.push(`-- ${candidate.name} (${candidate.city ?? "Unknown city"}) - matched: ${candidate.matchedPattern}`);
    lines.push(`-- UPDATE locations SET is_seasonal = true, seasonal_type = '${candidate.seasonalType}' WHERE id = '${candidate.id}';`);
    lines.push("");
  }

  lines.push("");
  lines.push("-- Low confidence matches (need manual review)");
  lines.push("");

  for (const candidate of lowConfidence) {
    lines.push(`-- ${candidate.name} (${candidate.city ?? "Unknown city"}) - matched: ${candidate.matchedPattern}`);
    lines.push(`-- UPDATE locations SET is_seasonal = true, seasonal_type = '${candidate.seasonalType}' WHERE id = '${candidate.id}';`);
    lines.push("");
  }

  return lines.join("\n");
}

async function applyHighConfidenceUpdates(candidates: SeasonalCandidate[]): Promise<void> {
  const highConfidence = candidates.filter((c) => c.confidence === "high");

  console.log(`\nApplying ${highConfidence.length} high-confidence updates...`);

  for (const candidate of highConfidence) {
    // Update location
    const { error: locationError } = await supabase
      .from("locations")
      .update({
        is_seasonal: true,
        seasonal_type: candidate.seasonalType,
      })
      .eq("id", candidate.id);

    if (locationError) {
      console.error(`Error updating location ${candidate.name}:`, locationError);
      continue;
    }

    // Insert availability rule if known
    if (candidate.knownAvailability) {
      const rule = candidate.knownAvailability;
      const { error: availabilityError } = await supabase
        .from("location_availability")
        .insert({
          location_id: candidate.id,
          availability_type: rule.availabilityType,
          month_start: rule.monthStart,
          day_start: rule.dayStart,
          month_end: rule.monthEnd,
          day_end: rule.dayEnd,
          week_ordinal: rule.weekOrdinal,
          day_of_week: rule.dayOfWeek,
          is_available: rule.isAvailable,
          description: rule.description,
        });

      if (availabilityError) {
        console.error(`Error inserting availability for ${candidate.name}:`, availabilityError);
        continue;
      }
    }

    console.log(`  Updated: ${candidate.name}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes("--apply");
  const jsonOutput = args.includes("--json");
  const verbose = args.includes("--verbose");

  console.log("Fetching all locations...");
  const locations = await fetchAllLocations();
  console.log(`Found ${locations.length} locations`);

  // Count already tagged
  const alreadyTagged = locations.filter((l) => l.is_seasonal);
  console.log(`Already tagged as seasonal: ${alreadyTagged.length}`);

  console.log("\nDetecting seasonal candidates...");
  const candidates = detectSeasonalCandidates(locations);

  // Group by confidence
  const highConfidence = candidates.filter((c) => c.confidence === "high");
  const mediumConfidence = candidates.filter((c) => c.confidence === "medium");
  const lowConfidence = candidates.filter((c) => c.confidence === "low");

  console.log("\n=== AUDIT RESULTS ===\n");
  console.log(`High confidence (known festivals): ${highConfidence.length}`);
  console.log(`Medium confidence (pattern match): ${mediumConfidence.length}`);
  console.log(`Low confidence (needs review): ${lowConfidence.length}`);
  console.log(`Total candidates: ${candidates.length}`);

  if (jsonOutput) {
    console.log("\n=== JSON OUTPUT ===\n");
    console.log(JSON.stringify(candidates, null, 2));
    return;
  }

  // Print high confidence matches
  console.log("\n=== HIGH CONFIDENCE MATCHES ===\n");
  for (const candidate of highConfidence) {
    console.log(`- ${candidate.name} (${candidate.city ?? "Unknown"})`);
    console.log(`  Type: ${candidate.seasonalType}`);
    if (candidate.knownAvailability?.description) {
      console.log(`  Dates: ${candidate.knownAvailability.description}`);
    }
  }

  if (verbose) {
    console.log("\n=== MEDIUM CONFIDENCE MATCHES ===\n");
    for (const candidate of mediumConfidence) {
      console.log(`- ${candidate.name} (${candidate.city ?? "Unknown"})`);
      console.log(`  Type: ${candidate.seasonalType}`);
      console.log(`  Pattern: ${candidate.matchedPattern}`);
    }

    console.log("\n=== LOW CONFIDENCE MATCHES ===\n");
    for (const candidate of lowConfidence) {
      console.log(`- ${candidate.name} (${candidate.city ?? "Unknown"})`);
      console.log(`  Type: ${candidate.seasonalType}`);
      console.log(`  Pattern: ${candidate.matchedPattern}`);
    }
  }

  // Generate SQL file
  const sql = generateUpdateSQL(candidates);
  const sqlPath = "scripts/output/seasonal-locations-update.sql";

  // Ensure output directory exists
  if (!fs.existsSync("scripts/output")) {
    fs.mkdirSync("scripts/output", { recursive: true });
  }

  fs.writeFileSync(sqlPath, sql);
  console.log(`\nGenerated SQL file: ${sqlPath}`);

  // Apply changes if requested
  if (applyChanges) {
    await applyHighConfidenceUpdates(candidates);
    console.log("\nHigh-confidence updates applied successfully!");
  } else {
    console.log("\nTo apply high-confidence updates, run with --apply flag");
  }
}

main().catch(console.error);
