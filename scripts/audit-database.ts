#!/usr/bin/env tsx
/**
 * Comprehensive Database Audit Script for Koku Travel
 *
 * Usage:
 *   npx tsx scripts/audit-database.ts                    # Full audit
 *   npx tsx scripts/audit-database.ts --json             # Output as JSON
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

interface AuditResult {
  section: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  count: number;
  details?: unknown[];
  recommendation: string;
}

interface AuditReport {
  timestamp: string;
  results: AuditResult[];
  healthScore: number;
  summary: {
    totalLocations: number;
    totalTrips: number;
    totalFavorites: number;
    totalAirports: number;
  };
}

// ============================================================================
// SECTION 1: DATA COMPLETENESS
// ============================================================================

async function auditMissingPlaceId(): Promise<AuditResult> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .or("place_id.is.null,place_id.eq.");

  return {
    section: "1.1",
    name: "Locations missing place_id",
    severity: count && count > 50 ? "high" : "medium",
    count: count || 0,
    recommendation:
      "Run Google Places enrichment: npx tsx scripts/enrich-all-locations.ts",
  };
}

async function auditMissingCoordinates(): Promise<AuditResult> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .is("coordinates", null);

  return {
    section: "1.2",
    name: "Locations missing coordinates",
    severity: count && count > 20 ? "high" : "medium",
    count: count || 0,
    recommendation: "Locations without coordinates cannot be routed in itineraries",
  };
}

async function auditMissingImages(): Promise<AuditResult> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .or("image.is.null,image.eq.");

  return {
    section: "1.3",
    name: "Locations missing images",
    severity: "low",
    count: count || 0,
    recommendation: "Consider adding images for better UX",
  };
}

async function auditMissingDescriptions(): Promise<AuditResult> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .is("short_description", null);

  return {
    section: "1.4",
    name: "Locations missing short_description",
    severity: "medium",
    count: count || 0,
    recommendation: "Descriptions improve search and display quality",
  };
}

async function auditFoodMissingMealOptions(): Promise<AuditResult> {
  // Get exact count first
  const { count: totalCount } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .in("category", ["food", "restaurant"])
    .is("meal_options", null);

  // Get sample for city breakdown (limit to 1000 for performance)
  const { data } = await supabase
    .from("locations")
    .select("city")
    .in("category", ["food", "restaurant"])
    .is("meal_options", null)
    .limit(1000);

  const byCityCount: Record<string, number> = {};
  for (const loc of data || []) {
    const city = loc.city || "Unknown";
    byCityCount[city] = (byCityCount[city] || 0) + 1;
  }

  return {
    section: "1.5",
    name: "Food locations missing meal_options",
    severity: (totalCount || 0) > 30 ? "high" : "medium",
    count: totalCount || 0,
    details: Object.entries(byCityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count })),
    recommendation:
      "Run Google Places enrichment for meal filtering: npx tsx scripts/enrich-google-places-full.ts",
  };
}

async function auditFoodMissingOperatingHours(): Promise<AuditResult> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .in("category", ["food", "restaurant"])
    .is("operating_hours", null);

  return {
    section: "1.6",
    name: "Food locations missing operating_hours",
    severity: (count || 0) > 30 ? "high" : "medium",
    count: count || 0,
    recommendation: "Operating hours needed for meal time filtering",
  };
}

async function auditCompletenessbyRegion(): Promise<AuditResult> {
  const { data } = await supabase.from("locations").select("region, place_id, coordinates, image, short_description");

  const byRegion: Record<
    string,
    { total: number; missingPlaceId: number; missingCoords: number; missingImage: number; missingDesc: number }
  > = {};

  for (const loc of data || []) {
    const region = loc.region || "Unknown";
    if (!byRegion[region]) {
      byRegion[region] = { total: 0, missingPlaceId: 0, missingCoords: 0, missingImage: 0, missingDesc: 0 };
    }
    byRegion[region].total++;
    if (!loc.place_id) byRegion[region].missingPlaceId++;
    if (!loc.coordinates) byRegion[region].missingCoords++;
    if (!loc.image) byRegion[region].missingImage++;
    if (!loc.short_description) byRegion[region].missingDesc++;
  }

  const details = Object.entries(byRegion)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([region, stats]) => ({
      region,
      ...stats,
      completenessScore: Math.round(
        ((stats.total - stats.missingPlaceId - stats.missingCoords) / stats.total / 2) * 100
      ),
    }));

  return {
    section: "1.7",
    name: "Completeness by region",
    severity: "info",
    count: Object.keys(byRegion).length,
    details,
    recommendation: "Focus enrichment on regions with lowest completeness scores",
  };
}

// ============================================================================
// SECTION 2: STALE/CLOSED LOCATIONS
// ============================================================================

async function auditPermanentlyClosed(): Promise<AuditResult> {
  const { data } = await supabase
    .from("locations")
    .select("id, name, city, category")
    .eq("business_status", "PERMANENTLY_CLOSED")
    .limit(50);

  return {
    section: "2.1",
    name: "Permanently closed locations",
    severity: (data?.length || 0) > 0 ? "critical" : "info",
    count: data?.length || 0,
    details: data?.slice(0, 20),
    recommendation: "Delete or archive these locations - they should not appear in itineraries",
  };
}

async function auditTemporarilyClosed(): Promise<AuditResult> {
  const { data } = await supabase
    .from("locations")
    .select("id, name, city, category")
    .eq("business_status", "TEMPORARILY_CLOSED")
    .limit(50);

  return {
    section: "2.2",
    name: "Temporarily closed locations",
    severity: (data?.length || 0) > 10 ? "medium" : "low",
    count: data?.length || 0,
    details: data?.slice(0, 10),
    recommendation: "Monitor these - may need periodic re-check via Google Places API",
  };
}

async function auditMissingBusinessStatus(): Promise<AuditResult> {
  const { count } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true })
    .is("business_status", null);

  return {
    section: "2.3",
    name: "Locations without business_status",
    severity: "medium",
    count: count || 0,
    recommendation: "Run Google Places enrichment to get business status",
  };
}

async function auditStalePlaceDetailsCache(): Promise<AuditResult> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { count } = await supabase
    .from("place_details")
    .select("*", { count: "exact", head: true })
    .lt("fetched_at", ninetyDaysAgo.toISOString());

  return {
    section: "2.4",
    name: "Stale place_details cache (>90 days)",
    severity: "low",
    count: count || 0,
    recommendation: "Consider refreshing old cache entries for up-to-date info",
  };
}

// ============================================================================
// SECTION 3: DUPLICATES
// ============================================================================

async function auditDuplicatePlaceIds(): Promise<AuditResult> {
  // Fetch all locations with place_id
  const { data } = await supabase
    .from("locations")
    .select("id, name, city, place_id")
    .not("place_id", "is", null)
    .neq("place_id", "");

  // Group by place_id
  const byPlaceId: Record<string, { id: string; name: string; city: string }[]> = {};
  for (const loc of data || []) {
    if (!loc.place_id) continue;
    if (!byPlaceId[loc.place_id]) byPlaceId[loc.place_id] = [];
    byPlaceId[loc.place_id].push({ id: loc.id, name: loc.name, city: loc.city });
  }

  // Find duplicates
  const duplicates = Object.entries(byPlaceId)
    .filter(([, locs]) => locs.length > 1)
    .map(([placeId, locs]) => ({ placeId: placeId.slice(0, 30), count: locs.length, locations: locs }));

  return {
    section: "3.1",
    name: "Duplicate place_ids (definite duplicates)",
    severity: duplicates.length > 0 ? "critical" : "info",
    count: duplicates.length,
    details: duplicates.slice(0, 10),
    recommendation: "Merge these entries - they are the same physical location",
  };
}

async function auditDuplicateNameCity(): Promise<AuditResult> {
  const { data } = await supabase.from("locations").select("id, name, city, place_id");

  // Group by name+city
  const byNameCity: Record<string, { id: string; name: string; city: string; place_id: string | null }[]> = {};
  for (const loc of data || []) {
    const key = `${(loc.name || "").toLowerCase().trim()}|${(loc.city || "").toLowerCase().trim()}`;
    if (!byNameCity[key]) byNameCity[key] = [];
    byNameCity[key].push(loc);
  }

  // Find duplicates with DIFFERENT place_ids (suspicious)
  const duplicates = Object.entries(byNameCity)
    .filter(([, locs]) => {
      if (locs.length <= 1) return false;
      const placeIds = new Set(locs.map((l) => l.place_id).filter(Boolean));
      return placeIds.size > 1; // Different place_ids = suspicious
    })
    .map(([key, locs]) => ({
      nameCity: key,
      count: locs.length,
      placeIds: [...new Set(locs.map((l) => l.place_id).filter(Boolean))].map((p) => (p as string).slice(0, 20)),
    }));

  return {
    section: "3.2",
    name: "Same name+city but different place_ids",
    severity: duplicates.length > 5 ? "high" : duplicates.length > 0 ? "medium" : "info",
    count: duplicates.length,
    details: duplicates.slice(0, 10),
    recommendation: "Review these - may be true duplicates or different branches",
  };
}

async function auditDuplicateNames(): Promise<AuditResult> {
  const { data } = await supabase.from("locations").select("id, name, city");

  // Group by normalized name
  const byName: Record<string, { id: string; name: string; city: string }[]> = {};
  for (const loc of data || []) {
    const key = (loc.name || "").toLowerCase().trim();
    if (!byName[key]) byName[key] = [];
    byName[key].push(loc);
  }

  // Find names with many duplicates
  const duplicates = Object.entries(byName)
    .filter(([, locs]) => locs.length > 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .map(([name, locs]) => ({
      name,
      count: locs.length,
      cities: [...new Set(locs.map((l) => l.city))].slice(0, 5),
    }));

  const totalDuplicates = Object.values(byName).filter((locs) => locs.length > 1).length;

  return {
    section: "3.3",
    name: "Duplicate names (across cities)",
    severity: "info",
    count: totalDuplicates,
    details: duplicates,
    recommendation: "Many are valid (chain stores, common names) - review top offenders",
  };
}

// ============================================================================
// SECTION 4: ORPHANED REFERENCES
// ============================================================================

async function auditOrphanedFavorites(): Promise<AuditResult> {
  // Get all favorites
  const { data: favorites } = await supabase.from("favorites").select("id, user_id, place_id, location_id");

  // Get all location place_ids and ids
  const { data: locations } = await supabase.from("locations").select("id, place_id");

  const locationIds = new Set((locations || []).map((l) => l.id));
  const placeIds = new Set((locations || []).filter((l) => l.place_id).map((l) => l.place_id));

  // Find orphans
  const orphans = (favorites || []).filter((f) => {
    const hasLocationRef = f.location_id && locationIds.has(f.location_id);
    const hasPlaceIdRef = f.place_id && placeIds.has(f.place_id);
    return !hasLocationRef && !hasPlaceIdRef;
  });

  return {
    section: "4.1",
    name: "Orphaned favorites (no matching location)",
    severity: orphans.length > 10 ? "medium" : "low",
    count: orphans.length,
    details: orphans.slice(0, 10).map((f) => ({ id: f.id, place_id: f.place_id, location_id: f.location_id })),
    recommendation: "Clean up orphaned favorites that reference deleted locations",
  };
}

async function auditOrphanedPlaceDetails(): Promise<AuditResult> {
  const { data: placeDetails } = await supabase.from("place_details").select("location_id");
  const { data: locations } = await supabase.from("locations").select("id");

  const locationIds = new Set((locations || []).map((l) => l.id));
  const orphans = (placeDetails || []).filter((pd) => !locationIds.has(pd.location_id));

  return {
    section: "4.2",
    name: "Orphaned place_details cache",
    severity: orphans.length > 50 ? "medium" : "low",
    count: orphans.length,
    recommendation: "Delete cache entries for non-existent locations",
  };
}

async function auditOrphanedLocationAvailability(): Promise<AuditResult> {
  const { data: availability } = await supabase.from("location_availability").select("id, location_id");
  const { data: locations } = await supabase.from("locations").select("id");

  const locationIds = new Set((locations || []).map((l) => l.id));
  const orphans = (availability || []).filter((a) => !locationIds.has(a.location_id));

  return {
    section: "4.3",
    name: "Orphaned location_availability rules",
    severity: orphans.length > 0 ? "medium" : "info",
    count: orphans.length,
    recommendation: "Delete availability rules for non-existent locations",
  };
}

// ============================================================================
// SECTION 5: FIELD USAGE ANALYSIS
// ============================================================================

async function auditFieldPopulation(): Promise<AuditResult> {
  const { data } = await supabase.from("locations").select(`
      id,
      neighborhood,
      prefecture,
      price_level,
      is_featured,
      is_seasonal,
      good_for_children,
      good_for_groups,
      editorial_summary,
      outdoor_seating,
      reservable
    `);

  const total = data?.length || 1;
  const stats: Record<string, { populated: number; pct: number }> = {};

  const fields = [
    "neighborhood",
    "prefecture",
    "price_level",
    "is_featured",
    "is_seasonal",
    "good_for_children",
    "good_for_groups",
    "editorial_summary",
    "outdoor_seating",
    "reservable",
  ];

  for (const field of fields) {
    const populated = (data || []).filter((d) => d[field] !== null && d[field] !== undefined && d[field] !== "")
      .length;
    stats[field] = {
      populated,
      pct: Math.round((populated / total) * 100),
    };
  }

  const details = Object.entries(stats)
    .sort((a, b) => a[1].pct - b[1].pct)
    .map(([field, { populated, pct }]) => ({ field, populated, pct: `${pct}%` }));

  return {
    section: "5.1",
    name: "Optional field population rates",
    severity: "info",
    count: fields.length,
    details,
    recommendation: "Low population fields may be candidates for removal or targeted enrichment",
  };
}

async function auditCategoryDistribution(): Promise<AuditResult> {
  const { data } = await supabase.from("locations").select("category");

  const distribution: Record<string, number> = {};
  for (const loc of data || []) {
    const cat = loc.category || "null";
    distribution[cat] = (distribution[cat] || 0) + 1;
  }

  const details = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      pct: `${Math.round((count / (data?.length || 1)) * 100)}%`,
    }));

  return {
    section: "5.2",
    name: "Category distribution",
    severity: "info",
    count: Object.keys(distribution).length,
    details,
    recommendation: "Review for balance - ensure good coverage across categories",
  };
}

async function auditCategoryTypeMismatch(): Promise<AuditResult> {
  const { data } = await supabase
    .from("locations")
    .select("id, name, city, category, google_primary_type")
    .not("google_primary_type", "is", null);

  // Find mismatches
  const mismatches = (data || []).filter((loc) => {
    const cat = loc.category?.toLowerCase();
    const gType = loc.google_primary_type?.toLowerCase();
    if (!cat || !gType) return false;

    // Food locations that aren't food-related types
    if (
      (cat === "food" || cat === "restaurant") &&
      ["temple", "shrine", "museum", "park", "tourist_attraction"].includes(gType)
    ) {
      return true;
    }

    // Attractions that are actually food places
    if (cat === "attraction" && ["restaurant", "cafe", "bar", "bakery"].includes(gType)) {
      return true;
    }

    return false;
  });

  return {
    section: "5.3",
    name: "Category vs Google type mismatches",
    severity: mismatches.length > 10 ? "medium" : "low",
    count: mismatches.length,
    details: mismatches.slice(0, 15).map((m) => ({
      name: m.name,
      city: m.city,
      category: m.category,
      googleType: m.google_primary_type,
    })),
    recommendation: "Review and fix category assignments for these locations",
  };
}

// ============================================================================
// SECTION 6: USER DATA AUDIT
// ============================================================================

async function auditEmptyTrips(): Promise<AuditResult> {
  const { data } = await supabase
    .from("trips")
    .select("id, name, created_at, updated_at, itinerary")
    .is("deleted_at", null);

  const emptyTrips = (data || []).filter((trip) => {
    const days = trip.itinerary?.days || [];
    return days.length === 0;
  });

  return {
    section: "6.1",
    name: "Empty trips (no days)",
    severity: "info",
    count: emptyTrips.length,
    recommendation: "These are abandoned trip creation attempts - consider cleanup policy",
  };
}

async function auditSoftDeletedTrips(): Promise<AuditResult> {
  const { count } = await supabase
    .from("trips")
    .select("*", { count: "exact", head: true })
    .not("deleted_at", "is", null);

  return {
    section: "6.2",
    name: "Soft-deleted trips",
    severity: "info",
    count: count || 0,
    recommendation: "Consider hard-deleting old soft-deleted trips (>30 days)",
  };
}

// ============================================================================
// HEALTH SCORE CALCULATION
// ============================================================================

async function calculateHealthScore(): Promise<{
  score: number;
  breakdown: Record<string, number>;
}> {
  const { data } = await supabase.from("locations").select(`
      place_id,
      coordinates,
      short_description,
      google_primary_type,
      business_status,
      image
    `);

  const total = data?.length || 1;

  const withPlaceId = (data || []).filter((d) => d.place_id && d.place_id !== "").length;
  const withCoords = (data || []).filter((d) => d.coordinates).length;
  const withDesc = (data || []).filter((d) => d.short_description).length;
  const withGoogleType = (data || []).filter((d) => d.google_primary_type).length;
  const withStatus = (data || []).filter((d) => d.business_status).length;
  const withImage = (data || []).filter((d) => d.image && d.image !== "").length;

  const breakdown = {
    "place_id (25%)": Math.round((withPlaceId / total) * 100),
    "coordinates (20%)": Math.round((withCoords / total) * 100),
    "description (15%)": Math.round((withDesc / total) * 100),
    "google_type (15%)": Math.round((withGoogleType / total) * 100),
    "business_status (15%)": Math.round((withStatus / total) * 100),
    "image (10%)": Math.round((withImage / total) * 100),
  };

  const score = Math.round(
    (0.25 * withPlaceId + 0.2 * withCoords + 0.15 * withDesc + 0.15 * withGoogleType + 0.15 * withStatus + 0.1 * withImage) /
      total *
      100
  );

  return { score, breakdown };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes("--json");

  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║       Koku Travel - Comprehensive Database Audit              ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  console.log("Running audit...\n");

  // Gather summary stats
  const { count: totalLocations } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });
  const { count: totalTrips } = await supabase.from("trips").select("*", { count: "exact", head: true });
  const { count: totalFavorites } = await supabase.from("favorites").select("*", { count: "exact", head: true });
  const { count: totalAirports } = await supabase.from("airports").select("*", { count: "exact", head: true });

  console.log(`📊 Database Summary:`);
  console.log(`   Locations: ${totalLocations}`);
  console.log(`   Trips: ${totalTrips}`);
  console.log(`   Favorites: ${totalFavorites}`);
  console.log(`   Airports: ${totalAirports}\n`);

  // Run all audits
  const results: AuditResult[] = [];

  console.log("=== Section 1: Data Completeness ===");
  results.push(await auditMissingPlaceId());
  results.push(await auditMissingCoordinates());
  results.push(await auditMissingImages());
  results.push(await auditMissingDescriptions());
  results.push(await auditFoodMissingMealOptions());
  results.push(await auditFoodMissingOperatingHours());
  results.push(await auditCompletenessbyRegion());

  console.log("=== Section 2: Stale/Closed Locations ===");
  results.push(await auditPermanentlyClosed());
  results.push(await auditTemporarilyClosed());
  results.push(await auditMissingBusinessStatus());
  results.push(await auditStalePlaceDetailsCache());

  console.log("=== Section 3: Duplicates ===");
  results.push(await auditDuplicatePlaceIds());
  results.push(await auditDuplicateNameCity());
  results.push(await auditDuplicateNames());

  console.log("=== Section 4: Orphaned References ===");
  results.push(await auditOrphanedFavorites());
  results.push(await auditOrphanedPlaceDetails());
  results.push(await auditOrphanedLocationAvailability());

  console.log("=== Section 5: Field Usage ===");
  results.push(await auditFieldPopulation());
  results.push(await auditCategoryDistribution());
  results.push(await auditCategoryTypeMismatch());

  console.log("=== Section 6: User Data ===");
  results.push(await auditEmptyTrips());
  results.push(await auditSoftDeletedTrips());

  // Calculate health score
  const { score: healthScore, breakdown } = await calculateHealthScore();

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    results,
    healthScore,
    summary: {
      totalLocations: totalLocations || 0,
      totalTrips: totalTrips || 0,
      totalFavorites: totalFavorites || 0,
      totalAirports: totalAirports || 0,
    },
  };

  // Output
  if (outputJson) {
    const outputPath = `scripts/output/audit-${new Date().toISOString().split("T")[0]}.json`;
    if (!fs.existsSync("scripts/output")) {
      fs.mkdirSync("scripts/output", { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to ${outputPath}`);
    return;
  }

  // Print results
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                     HEALTH SCORECARD");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log(`   Overall Health Score: ${healthScore}%\n`);
  console.log("   Breakdown:");
  for (const [metric, pct] of Object.entries(breakdown)) {
    const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
    console.log(`   ${metric.padEnd(25)} ${bar} ${pct}%`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                     AUDIT RESULTS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Group by severity
  const critical = results.filter((r) => r.severity === "critical" && r.count > 0);
  const high = results.filter((r) => r.severity === "high" && r.count > 0);
  const medium = results.filter((r) => r.severity === "medium" && r.count > 0);
  const low = results.filter((r) => r.severity === "low" && r.count > 0);

  if (critical.length > 0) {
    console.log("🔴 CRITICAL ISSUES:");
    for (const r of critical) {
      console.log(`   [${r.section}] ${r.name}: ${r.count}`);
      console.log(`       → ${r.recommendation}`);
      if (r.details && r.details.length > 0) {
        console.log(`       Sample: ${JSON.stringify(r.details.slice(0, 3))}`);
      }
    }
    console.log("");
  }

  if (high.length > 0) {
    console.log("🟠 HIGH PRIORITY:");
    for (const r of high) {
      console.log(`   [${r.section}] ${r.name}: ${r.count}`);
      console.log(`       → ${r.recommendation}`);
    }
    console.log("");
  }

  if (medium.length > 0) {
    console.log("🟡 MEDIUM PRIORITY:");
    for (const r of medium) {
      console.log(`   [${r.section}] ${r.name}: ${r.count}`);
      console.log(`       → ${r.recommendation}`);
    }
    console.log("");
  }

  if (low.length > 0) {
    console.log("🟢 LOW PRIORITY:");
    for (const r of low) {
      console.log(`   [${r.section}] ${r.name}: ${r.count}`);
    }
    console.log("");
  }

  // Info items summary
  const info = results.filter((r) => r.severity === "info");
  console.log("ℹ️  INFO (for reference):");
  for (const r of info) {
    console.log(`   [${r.section}] ${r.name}: ${r.count}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                  RECOMMENDED NEXT STEPS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (critical.length > 0) {
    console.log("1. ⚠️  Address CRITICAL issues first:");
    for (const r of critical) {
      console.log(`   - ${r.name}: ${r.recommendation}`);
    }
  }

  if (high.length > 0) {
    console.log("\n2. 🔧 Then address HIGH priority:");
    for (const r of high) {
      console.log(`   - ${r.name}`);
    }
  }

  console.log("\n✅ Audit complete!");

  // Save report
  const outputPath = `scripts/output/audit-${new Date().toISOString().split("T")[0]}.json`;
  if (!fs.existsSync("scripts/output")) {
    fs.mkdirSync("scripts/output", { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to ${outputPath}`);
}

main().catch(console.error);
