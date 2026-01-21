#!/usr/bin/env tsx
/**
 * Orchestrator script to run all regional scrapers
 *
 * This script runs all 8 regional DMO scrapers sequentially:
 * 1. Hokkaido
 * 2. Tohoku
 * 3. Central Japan (Chubu)
 * 4. Kansai
 * 5. Chugoku
 * 6. Shikoku
 * 7. Kyushu
 * 8. Okinawa
 *
 * Results are combined and saved to:
 * - tmp/all-scraped-locations.json (combined JSON)
 * - tmp/all-scraped-locations.ts (combined TypeScript)
 * - tmp/*-scraped.json (individual scraper outputs)
 *
 * Usage:
 *   npm run scrape:all              # Run all 8 regional DMO scrapers
 *   npm run scrape:all -- --jnto   # Include JNTO scraper (optional)
 *   or
 *   npx tsx scripts/scrapers/run-all-scrapers.ts
 *   npx tsx scripts/scrapers/run-all-scrapers.ts --jnto
 */

import { writeFileSync } from "fs";
import { join } from "path";
import type { ScrapedLocation, ScraperStats } from "./base-scraper";
import HokkaidoScraper from "./hokkaido-scraper";
import TohokuScraper from "./tohoku-scraper";
import CentralJapanScraper from "./central-japan-scraper";
import KansaiScraper from "./kansai-scraper";
import ChugokuScraper from "./chugoku-scraper";
import ShikokuScraper from "./shikoku-scraper";
import KyushuScraper from "./kyushu-scraper";
import OkinawaScraper from "./okinawa-scraper";
import JNTOScraper from "./jnto-scraper";

interface ScraperResult {
  name: string;
  region: string;
  stats: ScraperStats;
  locations: ScrapedLocation[];
  error?: string;
}

interface CombinedStats {
  totalLocations: number;
  totalScrapers: number;
  successfulScrapers: number;
  failedScrapers: number;
  totalDuration: number;
  categoryCounts: Record<string, number>;
  regionCounts: Record<string, number>;
  prefectureCounts: Record<string, number>;
  scraperResults: Array<{
    name: string;
    region: string;
    locationCount: number;
    duration: number;
    success: boolean;
  }>;
}

async function runAllScrapers(): Promise<void> {
  const startTime = Date.now();
  const results: ScraperResult[] = [];
  const allLocations: ScrapedLocation[] = [];

  console.log("=".repeat(80));
  console.log("KOKU TRAVEL - DMO WEB SCRAPING PIPELINE");
  console.log("=".repeat(80));
  console.log("Starting scraping of 8 Japan DMO websites...");
  console.log("⚠️  TEST DATA ONLY - FOR INTERNAL TESTING PURPOSES");
  console.log("=".repeat(80));
  console.log("");

  // Check if JNTO scraper should be included (via --jnto flag)
  const includeJNTO = process.argv.includes("--jnto");

  // Define all scrapers
  const scrapers = [
    { Scraper: HokkaidoScraper, name: "Hokkaido", region: "Hokkaido" },
    { Scraper: TohokuScraper, name: "Tohoku", region: "Tohoku" },
    { Scraper: CentralJapanScraper, name: "Central Japan", region: "Chubu" },
    { Scraper: KansaiScraper, name: "Kansai", region: "Kansai" },
    { Scraper: ChugokuScraper, name: "Chugoku", region: "Chugoku" },
    { Scraper: ShikokuScraper, name: "Shikoku", region: "Shikoku" },
    { Scraper: KyushuScraper, name: "Kyushu", region: "Kyushu" },
    { Scraper: OkinawaScraper, name: "Okinawa", region: "Okinawa" },
    // JNTO scraper is optional (can run standalone)
    ...(includeJNTO ? [{ Scraper: JNTOScraper, name: "JNTO", region: "All" }] : []),
  ];

  // Run each scraper
  for (const { Scraper, name, region } of scrapers) {
    try {
      console.log("");
      console.log("─".repeat(80));
      console.log(`Running ${name} scraper...`);
      console.log("─".repeat(80));
      console.log("");

      const scraper = new Scraper();
      const stats = await scraper.run();
      const locations = scraper.getLocations();

      results.push({
        name,
        region,
        stats,
        locations,
      });

      allLocations.push(...locations);

      console.log("");
      console.log(`✅ ${name} complete: ${locations.length} locations`);
      console.log("");
    } catch (error) {
      console.error(`❌ ${name} scraper failed:`, error);
      results.push({
        name,
        region,
        stats: {
          totalLocations: 0,
          successfulScrapes: 0,
          failedScrapes: 0,
          categoryCounts: {},
          prefectureCounts: {},
          cityCounts: {},
          duration: 0,
        },
        locations: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Calculate combined statistics
  const combinedStats: CombinedStats = {
    totalLocations: allLocations.length,
    totalScrapers: scrapers.length,
    successfulScrapers: results.filter((r) => !r.error).length,
    failedScrapers: results.filter((r) => r.error).length,
    totalDuration: Date.now() - startTime,
    categoryCounts: {},
    regionCounts: {},
    prefectureCounts: {},
    scraperResults: [],
  };

  // Aggregate category counts
  for (const location of allLocations) {
    combinedStats.categoryCounts[location.category] =
      (combinedStats.categoryCounts[location.category] || 0) + 1;

    combinedStats.regionCounts[location.region] =
      (combinedStats.regionCounts[location.region] || 0) + 1;

    if (location.prefecture) {
      combinedStats.prefectureCounts[location.prefecture] =
        (combinedStats.prefectureCounts[location.prefecture] || 0) + 1;
    }
  }

  // Build scraper results summary
  for (const result of results) {
    combinedStats.scraperResults.push({
      name: result.name,
      region: result.region,
      locationCount: result.locations.length,
      duration: result.stats.duration,
      success: !result.error,
    });
  }

  // Save combined results to JSON
  const combinedJsonPath = join(process.cwd(), "tmp", "all-scraped-locations.json");
  const combinedData = {
    metadata: {
      scrapedAt: new Date().toISOString(),
      totalScrapers: combinedStats.totalScrapers,
      successfulScrapers: combinedStats.successfulScrapers,
      failedScrapers: combinedStats.failedScrapers,
      totalLocations: combinedStats.totalLocations,
      totalDuration: combinedStats.totalDuration,
    },
    stats: combinedStats,
    locations: allLocations,
  };

  writeFileSync(combinedJsonPath, JSON.stringify(combinedData, null, 2), "utf-8");

  // Save combined results to TypeScript
  const combinedTsPath = join(process.cwd(), "tmp", "all-scraped-locations.ts");
  const tsContent = `/**
 * Combined scraped locations from all 8 Japan DMO websites
 *
 * Total Locations: ${combinedStats.totalLocations}
 * Successful Scrapers: ${combinedStats.successfulScrapers}/${combinedStats.totalScrapers}
 * Scraped: ${new Date().toISOString()}
 * Duration: ${(combinedStats.totalDuration / 1000).toFixed(2)}s
 *
 * ⚠️ TEST DATA ONLY - DELETE BEFORE LAUNCH ⚠️
 */

export interface ScrapedLocation {
  name: string;
  category: string;
  region: string;
  prefecture?: string;
  city?: string;
  source: string;
  sourceUrl: string;
  description?: string;
  scrapedAt: string;
  note: string;
}

export const ALL_SCRAPED_LOCATIONS: ScrapedLocation[] = ${JSON.stringify(allLocations, null, 2)};

export const SCRAPING_STATS = ${JSON.stringify(combinedStats, null, 2)};

// Export by region
${results
  .map(
    (r) =>
      `export const ${r.region.toUpperCase().replace(/\s+/g, "_")}_LOCATIONS = ALL_SCRAPED_LOCATIONS.filter(loc => loc.region === "${r.region}");`,
  )
  .join("\n")}
`;

  writeFileSync(combinedTsPath, tsContent, "utf-8");

  // Print final summary
  console.log("");
  console.log("=".repeat(80));
  console.log("ALL SCRAPERS COMPLETE!");
  console.log("=".repeat(80));
  console.log("");
  console.log(`Total Locations: ${combinedStats.totalLocations}`);
  console.log(`Successful Scrapers: ${combinedStats.successfulScrapers}/${combinedStats.totalScrapers}`);
  console.log(`Failed Scrapers: ${combinedStats.failedScrapers}`);
  console.log(`Total Duration: ${(combinedStats.totalDuration / 1000).toFixed(2)}s`);
  console.log("");
  console.log("Results by Region:");
  console.log("─".repeat(80));
  for (const result of combinedStats.scraperResults) {
    const status = result.success ? "✅" : "❌";
    console.log(
      `${status} ${result.name.padEnd(20)} ${result.locationCount.toString().padStart(4)} locations  (${(result.duration / 1000).toFixed(1)}s)`,
    );
  }
  console.log("");
  console.log("Category Distribution:");
  console.log("─".repeat(80));
  Object.entries(combinedStats.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = ((count / combinedStats.totalLocations) * 100).toFixed(1);
      console.log(`  ${category.padEnd(15)} ${count.toString().padStart(4)} (${percentage}%)`);
    });

  if (Object.keys(combinedStats.prefectureCounts).length > 0) {
    console.log("");
    console.log("Top 10 Prefectures:");
    console.log("─".repeat(80));
    Object.entries(combinedStats.prefectureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([prefecture, count]) => {
        console.log(`  ${prefecture.padEnd(20)} ${count.toString().padStart(4)} locations`);
      });
  }

  console.log("");
  console.log("Output Files:");
  console.log("─".repeat(80));
  console.log(`  Combined JSON:  ${combinedJsonPath}`);
  console.log(`  Combined TS:    ${combinedTsPath}`);
  console.log("  Individual:     tmp/*-scraped.json");
  console.log("");
  console.log("=".repeat(80));
  console.log("⚠️  REMINDER: This is TEST DATA ONLY");
  console.log("   All data must be deleted before production launch");
  console.log("   Partner with DMOs officially before using their data");
  console.log("=".repeat(80));
  console.log("");

  // Exit with error if any scrapers failed
  if (combinedStats.failedScrapers > 0) {
    console.error(`\n❌ ${combinedStats.failedScrapers} scraper(s) failed. Check logs above.`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllScrapers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error in orchestrator:", error);
      process.exit(1);
    });
}

export { runAllScrapers };
