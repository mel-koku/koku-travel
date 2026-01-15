/**
 * Base scraper class with shared utilities for all regional scrapers
 *
 * Features:
 * - HTTP fetching with axios
 * - HTML parsing with cheerio
 * - Rate limiting
 * - Category normalization
 * - Text cleaning utilities
 * - File saving (JSON and TypeScript)
 * - Error handling
 */

import axios, { AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
import { join } from "path";

export interface ScrapedLocation {
  name: string;
  category: string; // culture, attraction, nature, food, shopping, hotel
  region: string; // Hokkaido, Tohoku, Chubu, etc.
  prefecture?: string;
  city?: string;
  source: string; // e.g., "hokkaido_dmo"
  sourceUrl: string;
  description?: string;
  scrapedAt: string; // ISO timestamp
  note: string; // "TEST DATA - DELETE BEFORE LAUNCH"
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  region: string;
  userAgent?: string;
  rateLimit?: number; // milliseconds between requests
}

export interface ScraperStats {
  totalLocations: number;
  successfulScrapes: number;
  failedScrapes: number;
  categoryCounts: Record<string, number>;
  prefectureCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  duration: number; // milliseconds
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected stats: ScraperStats;
  protected locations: ScrapedLocation[];
  protected startTime: number;

  // Category mapping from various source terms to our standard categories
  protected categoryMap: Record<string, string> = {
    // Culture
    "temple": "culture",
    "shrine": "culture",
    "museum": "culture",
    "gallery": "culture",
    "art": "culture",
    "heritage": "culture",
    "historic": "culture",
    "historical": "culture",
    "castle": "culture",
    "palace": "culture",
    "traditional": "culture",
    "cultural": "culture",

    // Attraction
    "attraction": "attraction",
    "theme park": "attraction",
    "amusement": "attraction",
    "zoo": "attraction",
    "aquarium": "attraction",
    "entertainment": "attraction",
    "sightseeing": "attraction",
    "landmark": "attraction",
    "tower": "attraction",

    // Nature
    "nature": "nature",
    "park": "nature",
    "garden": "nature",
    "mountain": "nature",
    "beach": "nature",
    "lake": "nature",
    "river": "nature",
    "waterfall": "nature",
    "hot spring": "nature",
    "onsen": "nature",
    "hiking": "nature",
    "outdoor": "nature",
    "natural": "nature",

    // Food
    "restaurant": "food",
    "food": "food",
    "dining": "food",
    "cafe": "food",
    "bar": "food",
    "cuisine": "food",
    "eat": "food",
    "drink": "food",

    // Shopping
    "shopping": "shopping",
    "shop": "shopping",
    "market": "shopping",
    "mall": "shopping",
    "store": "shopping",

    // Hotel
    "hotel": "hotel",
    "accommodation": "hotel",
    "resort": "hotel",
    "lodging": "hotel",
    "stay": "hotel",
    "inn": "hotel",
    "ryokan": "hotel",
  };

  constructor(config: ScraperConfig) {
    this.config = {
      userAgent: "Mozilla/5.0 (compatible; KokuTravelBot/1.0; +https://koku.travel)",
      rateLimit: 1500, // 1.5 seconds default
      ...config,
    };

    this.locations = [];
    this.stats = {
      totalLocations: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      categoryCounts: {},
      prefectureCounts: {},
      cityCounts: {},
      duration: 0,
    };
    this.startTime = Date.now();
  }

  /**
   * Main scraping method to be implemented by each scraper
   */
  abstract scrape(): Promise<ScrapedLocation[]>;

  /**
   * Fetch HTML content from a URL
   */
  protected async fetchHtml(url: string, options?: AxiosRequestConfig): Promise<cheerio.CheerioAPI> {
    try {
      this.log(`Fetching: ${url}`);

      const response = await axios.get(url, {
        headers: {
          "User-Agent": this.config.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          ...options?.headers,
        },
        timeout: 30000, // 30 seconds
        ...options,
      });

      return cheerio.load(response.data);
    } catch (error) {
      this.logError(`Failed to fetch ${url}`, error);
      throw error;
    }
  }

  /**
   * Rate limiting delay
   */
  protected async delay(ms?: number): Promise<void> {
    const delayMs = ms ?? this.config.rateLimit ?? 1500;
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Normalize category from source text to standard category
   */
  protected normalizeCategory(sourceCategory: string): string {
    const normalized = sourceCategory.toLowerCase().trim();

    // Check for exact matches first
    for (const [key, value] of Object.entries(this.categoryMap)) {
      if (normalized === key) {
        return value;
      }
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(this.categoryMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    // Default to attraction if no match
    return "attraction";
  }

  /**
   * Clean text - remove extra whitespace, trim, etc.
   */
  protected cleanText(text: string | undefined | null): string {
    if (!text) return "";
    return text
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, "\n") // Remove empty lines
      .trim();
  }

  /**
   * Extract domain from URL
   */
  protected extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Add a location to the collection
   */
  protected addLocation(location: Omit<ScrapedLocation, "scrapedAt" | "note" | "source">): void {
    const fullLocation: ScrapedLocation = {
      ...location,
      source: this.config.name,
      scrapedAt: new Date().toISOString(),
      note: "TEST DATA - DELETE BEFORE LAUNCH",
    };

    this.locations.push(fullLocation);
    this.stats.totalLocations++;

    // Update category counts
    this.stats.categoryCounts[fullLocation.category] =
      (this.stats.categoryCounts[fullLocation.category] || 0) + 1;

    // Update prefecture counts
    if (fullLocation.prefecture) {
      this.stats.prefectureCounts[fullLocation.prefecture] =
        (this.stats.prefectureCounts[fullLocation.prefecture] || 0) + 1;
    }

    // Update city counts
    if (fullLocation.city) {
      this.stats.cityCounts[fullLocation.city] =
        (this.stats.cityCounts[fullLocation.city] || 0) + 1;
    }
  }

  /**
   * Save results to JSON file
   */
  protected saveToJson(filename: string): void {
    const outputPath = join(process.cwd(), "tmp", filename);
    const data = {
      metadata: {
        scraper: this.config.name,
        region: this.config.region,
        baseUrl: this.config.baseUrl,
        scrapedAt: new Date().toISOString(),
        totalLocations: this.locations.length,
      },
      locations: this.locations,
      stats: this.stats,
    };

    writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    this.log(`Saved ${this.locations.length} locations to ${outputPath}`);
  }

  /**
   * Save results to TypeScript file
   */
  protected saveToTypeScript(filename: string): void {
    const outputPath = join(process.cwd(), "tmp", filename);

    const tsContent = `/**
 * Scraped locations from ${this.config.name}
 * Region: ${this.config.region}
 * Source: ${this.config.baseUrl}
 * Scraped: ${new Date().toISOString()}
 * Total: ${this.locations.length} locations
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

export const ${this.config.name.toUpperCase()}_LOCATIONS: ScrapedLocation[] = ${JSON.stringify(this.locations, null, 2)};

export const ${this.config.name.toUpperCase()}_STATS = ${JSON.stringify(this.stats, null, 2)};
`;

    writeFileSync(outputPath, tsContent, "utf-8");
    this.log(`Saved TypeScript file to ${outputPath}`);
  }

  /**
   * Run the scraper and save results
   */
  async run(): Promise<ScraperStats> {
    try {
      this.log(`Starting ${this.config.name} scraper...`);
      this.log(`Target: ${this.config.baseUrl}`);
      this.log(`Region: ${this.config.region}`);
      this.log(`Rate limit: ${this.config.rateLimit}ms between requests`);
      this.log("");

      // Run the scraping logic
      await this.scrape();

      // Calculate duration
      this.stats.duration = Date.now() - this.startTime;

      // Save results
      const jsonFilename = `${this.config.name}-scraped.json`;
      const tsFilename = `${this.config.name}-scraped.ts`;

      this.saveToJson(jsonFilename);
      this.saveToTypeScript(tsFilename);

      // Print summary
      this.log("");
      this.log("=".repeat(60));
      this.log(`${this.config.name} Scraper Complete!`);
      this.log("=".repeat(60));
      this.log(`Total locations: ${this.stats.totalLocations}`);
      this.log(`Duration: ${(this.stats.duration / 1000).toFixed(2)}s`);
      this.log("");
      this.log("Categories:");
      Object.entries(this.stats.categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          this.log(`  ${cat}: ${count}`);
        });

      if (Object.keys(this.stats.prefectureCounts).length > 0) {
        this.log("");
        this.log("Prefectures:");
        Object.entries(this.stats.prefectureCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([pref, count]) => {
            this.log(`  ${pref}: ${count}`);
          });
      }

      this.log("=".repeat(60));
      this.log("");

      return this.stats;
    } catch (error) {
      this.logError("Fatal error in scraper", error);
      throw error;
    }
  }

  /**
   * Logging utilities
   */
  protected log(message: string): void {
    console.log(`[${this.config.name}] ${message}`);
  }

  protected logError(message: string, error?: unknown): void {
    console.error(`[${this.config.name}] ❌ ${message}`);
    if (error instanceof Error) {
      console.error(`  Error: ${error.message}`);
    } else if (error) {
      console.error(`  Error:`, error);
    }
  }

  protected logSuccess(message: string): void {
    console.log(`[${this.config.name}] ✅ ${message}`);
  }

  protected logWarning(message: string): void {
    console.warn(`[${this.config.name}] ⚠️  ${message}`);
  }

  /**
   * Get current locations
   */
  getLocations(): ScrapedLocation[] {
    return this.locations;
  }

  /**
   * Get current stats
   */
  getStats(): ScraperStats {
    return this.stats;
  }
}
