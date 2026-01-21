#!/usr/bin/env tsx
/**
 * JNTO (Japan National Tourism Organization) Website Scraper
 *
 * Source: https://www.japan.travel/en/us/
 * Expected: 500-1000+ locations across all regions
 * Region: All regions (multi-region scraper)
 *
 * This scraper extracts location data from the official JNTO website
 * with comprehensive duplicate detection:
 * 1. Within-JNTO deduplication (during scraping)
 * 2. Database duplicate detection (before insert)
 *
 * For INTERNAL TESTING purposes only.
 */

// Load environment variables from .env.local FIRST
import { config } from "dotenv";
const result = config({ path: ".env.local" });

if (result.error) {
  console.error("Failed to load .env.local:", result.error);
  process.exit(1);
}

import * as cheerio from "cheerio";
import { BaseScraper, ScrapedLocation } from "./base-scraper";

// Database duplicate detection (optional - only if SUPABASE_SERVICE_ROLE_KEY is available)
let getServiceRoleClient: typeof import("@/lib/supabase/serviceRole").getServiceRoleClient | null = null;
let dbDuplicateCheckEnabled = false;

interface ExistingLocationCache {
  placeIds: Set<string>;
  sourceUrls: Set<string>;
  nameRegionPairs: Map<string, Set<string>>; // normalized name -> Set of regions
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
}

export class JNTOScraper extends BaseScraper {
  // Within-JNTO deduplication tracking
  private seenUrls: Set<string> = new Set();
  private seenNames: Map<string, Set<string>> = new Map(); // normalized name -> Set of URLs
  private skippedDuplicates = 0;

  // Database duplicate detection cache
  private existingLocationsCache: ExistingLocationCache = {
    placeIds: new Set(),
    sourceUrls: new Set(),
    nameRegionPairs: new Map(),
  };

  constructor() {
    super({
      name: "jnto",
      baseUrl: "https://www.japan.travel/en/", // Base URL for content pages
      region: "All", // Multi-region scraper
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  // Homepage URL (different from base URL)
  private get homepageUrl(): string {
    return "https://www.japan.travel/en/us/";
  }

  /**
   * Load existing locations from database for duplicate checking
   */
  private async loadExistingLocations(): Promise<void> {
    try {
      // Dynamically import to ensure env vars are loaded
      if (!getServiceRoleClient) {
        const serviceRoleModule = await import("@/lib/supabase/serviceRole");
        getServiceRoleClient = serviceRoleModule.getServiceRoleClient;
      }

      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.logWarning("SUPABASE_SERVICE_ROLE_KEY not found. Database duplicate checking disabled.");
        dbDuplicateCheckEnabled = false;
        return;
      }

      dbDuplicateCheckEnabled = true;
      this.log("Loading existing locations from database for duplicate checking...");

      const supabase = getServiceRoleClient();
      const { data: locations, error } = await supabase
        .from("locations")
        .select("place_id, seed_source_url, name, region");

      if (error) {
        this.logError("Failed to load existing locations", error);
        dbDuplicateCheckEnabled = false;
        return;
      }

      if (!locations || locations.length === 0) {
        this.log("No existing locations found in database.");
        return;
      }

      // Build cache
      for (const loc of locations) {
        if (loc.place_id) {
          this.existingLocationsCache.placeIds.add(loc.place_id);
        }
        if (loc.seed_source_url) {
          this.existingLocationsCache.sourceUrls.add(loc.seed_source_url);
        }
        if (loc.name && loc.region) {
          const normalizedName = this.normalizeName(loc.name);
          if (!this.existingLocationsCache.nameRegionPairs.has(normalizedName)) {
            this.existingLocationsCache.nameRegionPairs.set(normalizedName, new Set());
          }
          this.existingLocationsCache.nameRegionPairs.get(normalizedName)!.add(loc.region);
        }
      }

      this.logSuccess(
        `Loaded ${locations.length} existing locations (${this.existingLocationsCache.placeIds.size} place_ids, ${this.existingLocationsCache.sourceUrls.size} URLs)`,
      );
    } catch (error) {
      this.logError("Error loading existing locations", error);
      dbDuplicateCheckEnabled = false;
    }
  }

  /**
   * Normalize name for comparison (lowercase, remove extra spaces, trim)
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[^\w\s-]/g, ""); // Remove special characters except hyphens
  }

  /**
   * Check if location is duplicate within JNTO (during scraping)
   */
  private isDuplicateWithinJNTO(url: string, name: string, placeId?: string): boolean {
    // Check URL first (fastest)
    if (this.seenUrls.has(url)) {
      return true;
    }

    // Check normalized name + URL combination
    const normalizedName = this.normalizeName(name);
    const existingUrls = this.seenNames.get(normalizedName);
    if (existingUrls && existingUrls.size > 0) {
      // If same normalized name exists with different URL, might be duplicate
      // But allow if URLs are significantly different (could be different pages for same place)
      // For now, we'll be conservative and only flag exact URL matches
      // Name-based deduplication happens at database level
    }

    return false;
  }

  /**
   * Mark location as seen (within JNTO)
   */
  private markAsSeen(url: string, name: string, placeId?: string): void {
    this.seenUrls.add(url);
    const normalizedName = this.normalizeName(name);
    if (!this.seenNames.has(normalizedName)) {
      this.seenNames.set(normalizedName, new Set());
    }
    this.seenNames.get(normalizedName)!.add(url);
  }

  /**
   * Check if location is duplicate in database
   */
  private async isDuplicateInDatabase(
    location: Omit<ScrapedLocation, "scrapedAt" | "note" | "source">,
    placeId?: string,
  ): Promise<DuplicateCheckResult> {
    if (!dbDuplicateCheckEnabled) {
      return { isDuplicate: false };
    }

    // 1. Check place_id (most reliable)
    if (placeId && this.existingLocationsCache.placeIds.has(placeId)) {
      return { isDuplicate: true, reason: "place_id exists" };
    }

    // 2. Check seed_source_url (exact URL match)
    if (location.sourceUrl && this.existingLocationsCache.sourceUrls.has(location.sourceUrl)) {
      return { isDuplicate: true, reason: "source_url exists" };
    }

    // 3. Check normalized name + region combination
    const normalizedName = this.normalizeName(location.name);
    const existingRegions = this.existingLocationsCache.nameRegionPairs.get(normalizedName);
    if (existingRegions && existingRegions.has(location.region)) {
      return { isDuplicate: true, reason: "name+region exists" };
    }

    return { isDuplicate: false };
  }

  /**
   * Main scraping method
   */
  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // Load existing locations from database
      await this.loadExistingLocations();

      this.log("Starting JNTO scraping with sequential spot ID iteration...");
      this.log("");

      // Scrape sequential spot IDs (1-2366)
      await this.scrapeSequentialSpotIds();

      this.logSuccess(
        `Scraped ${this.stats.successfulScrapes} locations from ${this.config.name}`,
      );
      if (this.skippedDuplicates > 0) {
        this.log(`Skipped ${this.skippedDuplicates} duplicates within JNTO`);
      }

      return this.locations;
    } catch (error) {
      this.logError("Fatal error during scraping", error);
      throw error;
    }
  }

  /**
   * Scrape sequential spot IDs from 1 to 2366
   */
  private async scrapeSequentialSpotIds(): Promise<void> {
    // TEST MODE: Use small range for initial testing
    // Change MAX_SPOT_ID to 2366 for full scrape
    const MAX_SPOT_ID = process.env.TEST_MODE === "true" ? 20 : 2366;
    this.log(`Scraping sequential spot IDs (1-${MAX_SPOT_ID})...`);

    const MAX_CONSECUTIVE_404S = 50;
    let consecutive404s = 0;

    for (let spotId = 1; spotId <= MAX_SPOT_ID; spotId++) {
      try {
        const spotUrl = `${this.config.baseUrl}spot/${spotId}/`;

        // Quick validation: check if page exists
        let $: cheerio.CheerioAPI;
        try {
          $ = await this.fetchHtml(spotUrl);
        } catch (error: any) {
          // Handle 404s gracefully
          if (error.response?.status === 404 || error.message?.includes("404")) {
            consecutive404s++;
            if (consecutive404s >= MAX_CONSECUTIVE_404S) {
              this.log(`Stopping at spot ${spotId} after ${MAX_CONSECUTIVE_404S} consecutive 404s`);
              break;
            }
            continue;
          }
          // Re-throw other errors
          throw error;
        }

        const h1Text = $("h1").first().text().trim();

        // Check if valid page (has h1 with content)
        if (!h1Text || h1Text.toLowerCase().includes("not found")) {
          consecutive404s++;
          if (consecutive404s >= MAX_CONSECUTIVE_404S) {
            this.log(`Stopping at spot ${spotId} after ${MAX_CONSECUTIVE_404S} consecutive 404s`);
            break;
          }
          continue;
        }

        consecutive404s = 0; // Reset on success

        // Log progress every 100 spots (or every 5 in test mode)
        const progressInterval = MAX_SPOT_ID <= 20 ? 5 : 100;
        if (spotId % progressInterval === 0) {
          this.log(`Progress: ${spotId}/${MAX_SPOT_ID} spots processed...`);
        }

        // Extract region from already-fetched page content
        const region = this.inferRegionFromPage($, spotUrl);
        await this.scrapeLocationDetailPage(spotUrl, region, undefined, $);

        await this.delay(); // Rate limiting
      } catch (error: any) {
        // Handle 404s gracefully
        if (error.response?.status === 404 || error.message?.includes("404")) {
          consecutive404s++;
          if (consecutive404s >= MAX_CONSECUTIVE_404S) {
            this.log(`Stopping at spot ${spotId} after ${MAX_CONSECUTIVE_404S} consecutive 404s`);
            break;
          }
          continue;
        }

        // Log other errors but continue
        this.logError(`Failed to scrape spot/${spotId}/`, error);
        this.stats.failedScrapes++;
      }
    }
  }

  /**
   * Scrape regional destination pages
   */
  private async scrapeRegionalPages(): Promise<void> {
    this.log("Scraping regional destination pages...");

    // Start from destinations index page
    try {
      await this.delay();
      const destinationsUrl = `${this.config.baseUrl}destinations/`;
      const $ = await this.fetchHtml(destinationsUrl);

      const locationLinks = this.extractLocationLinks($, destinationsUrl);
      this.log(`Found ${locationLinks.length} location links in destinations index`);

      for (const link of locationLinks) {
        await this.delay();
        const region = await this.inferRegionFromUrl(link);
        await this.scrapeLocationDetailPage(link, region);
      }
    } catch (error) {
      this.logError("Failed to scrape destinations index", error);
      this.stats.failedScrapes++;
    }
  }

  /**
   * Scrape major city pages (skipped - cities are covered in destinations)
   */
  private async scrapeCityPages(): Promise<void> {
    // Cities are covered in the destinations scraping
    this.log("Skipping city pages (covered in destinations)...");
  }

  /**
   * Scrape category pages (Things to Do)
   */
  private async scrapeCategoryPages(): Promise<void> {
    this.log("Scraping category pages...");

    const categories = [
      { slug: "attraction", category: "attraction" },
      { slug: "culture", category: "culture" },
      { slug: "relaxation", category: "nature" },
      { slug: "shopping", category: "shopping" },
      { slug: "action-and-adventure", category: "attraction" },
      { slug: "art-and-design", category: "culture" },
      { slug: "history", category: "culture" },
      { slug: "nature", category: "nature" },
      { slug: "festivals-and-events", category: "culture" },
      { slug: "eat-and-drink", category: "food" },
      { slug: "national-parks", category: "nature" },
      { slug: "adventure", category: "attraction" },
    ];

    for (const { slug, category } of categories) {
      try {
        await this.delay();
        const categoryUrl = `${this.config.baseUrl}things-to-do/${slug}/`;
        const $ = await this.fetchHtml(categoryUrl);

        // First, extract subcategory links (e.g., /things-to-do/attraction/scenic-spot/)
        const subcategoryLinks: string[] = [];
        $('a[href*="things-to-do/"]').each((_, element) => {
          const href = $(element).attr("href");
          if (!href) return;
          
          try {
            let fullUrl: string;
            if (href.startsWith("http")) {
              fullUrl = href;
            } else if (href.startsWith("/")) {
              fullUrl = new URL(href, "https://www.japan.travel").href;
            } else {
              fullUrl = new URL(href, this.config.baseUrl).href;
            }
            
            // Check if it's a subcategory (has 3+ path segments: things-to-do/category/subcategory)
            // Note: URLs may include /en/ prefix, so we need to find 'things-to-do' in the path
            const pathParts = new URL(fullUrl).pathname.split("/").filter(Boolean);
            const thingsToDoIndex = pathParts.indexOf("things-to-do");
            if (
              thingsToDoIndex !== -1 &&
              pathParts.length >= thingsToDoIndex + 3 &&
              pathParts[thingsToDoIndex + 1] === slug &&
              !subcategoryLinks.includes(fullUrl)
            ) {
              subcategoryLinks.push(fullUrl);
            }
          } catch {
            // Invalid URL, skip
          }
        });

        this.log(`Found ${subcategoryLinks.length} subcategories in ${slug}`);

        // Scrape locations from main category page
        const locationLinks = this.extractLocationLinks($, categoryUrl);
        this.log(`Found ${locationLinks.length} location links in category ${slug} (main page)`);

        for (const link of locationLinks) {
          await this.delay();
          const region = await this.inferRegionFromUrl(link);
          await this.scrapeLocationDetailPage(link, region, category);
        }

        // Scrape locations from each subcategory page
        for (const subcategoryUrl of subcategoryLinks) {
          try {
            await this.delay();
            const $sub = await this.fetchHtml(subcategoryUrl);
            const subLocationLinks = this.extractLocationLinks($sub, subcategoryUrl);
            this.log(`Found ${subLocationLinks.length} location links in subcategory ${subcategoryUrl}`);

            for (const link of subLocationLinks) {
              await this.delay();
              const region = await this.inferRegionFromUrl(link);
              await this.scrapeLocationDetailPage(link, region, category);
            }
          } catch (error) {
            this.logError(`Failed to scrape subcategory ${subcategoryUrl}`, error);
            this.stats.failedScrapes++;
          }
        }
      } catch (error) {
        this.logError(`Failed to scrape category ${slug}`, error);
        this.stats.failedScrapes++;
      }
    }
  }

  /**
   * Scrape popular places from homepage
   */
  private async scrapePopularPlaces(): Promise<void> {
    this.log("Scraping popular places from homepage...");

    try {
      const $ = await this.fetchHtml(this.homepageUrl);
      
      // Extract spot links from Popular Places section
      const spotLinks: string[] = [];
      $('a[href*="spot/"]').each((_, element) => {
        const href = $(element).attr("href");
        if (!href) return;
        
        try {
          // Resolve relative URLs - spot URLs resolve to /en/ base
          let fullUrl: string;
          if (href.startsWith("http")) {
            fullUrl = href;
          } else if (href.startsWith("/")) {
            fullUrl = new URL(href, "https://www.japan.travel").href;
          } else {
            // Relative URL - resolve to /en/ base
            fullUrl = new URL(href, this.config.baseUrl).href;
          }
          
          // Only include spot detail pages (with numeric ID)
          if (fullUrl.match(/\/spot\/\d+\/?$/)) {
            if (!spotLinks.includes(fullUrl)) {
              spotLinks.push(fullUrl);
            }
          }
        } catch {
          // Invalid URL, skip
        }
      });

      // Also extract destination links
      const destinationLinks: string[] = [];
      $('a[href*="destinations/"]').each((_, element) => {
        const href = $(element).attr("href");
        if (!href) return;
        
        try {
          let fullUrl: string;
          if (href.startsWith("http")) {
            fullUrl = href;
          } else if (href.startsWith("/")) {
            fullUrl = new URL(href, "https://www.japan.travel").href;
          } else {
            fullUrl = new URL(href, this.config.baseUrl).href;
          }
          
          const pathParts = new URL(fullUrl).pathname.split("/").filter(Boolean);
          // Include destination pages with 3+ path segments (region/prefecture/city)
          if (pathParts.length >= 3 && pathParts[0] === "destinations") {
            if (!destinationLinks.includes(fullUrl)) {
              destinationLinks.push(fullUrl);
            }
          }
        } catch {
          // Invalid URL, skip
        }
      });

      const allLinks = [...spotLinks, ...destinationLinks];
      this.log(`Found ${allLinks.length} location links (${spotLinks.length} spots, ${destinationLinks.length} destinations)`);

      for (const link of allLinks) {
        await this.delay();
        const region = await this.inferRegionFromUrl(link);
        await this.scrapeLocationDetailPage(link, region);
      }
    } catch (error) {
      this.logError("Failed to scrape popular places", error);
      this.stats.failedScrapes++;
    }
  }

  /**
   * Scrape interest-based pages (skipped - covered by categories)
   */
  private async scrapeInterestPages(): Promise<void> {
    // Interests are covered by the category pages
    this.log("Skipping interest pages (covered by categories)...");
  }

  /**
   * Extract location links from a page
   */
  private extractLocationLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];

    // Extract spot links (format: spot/123/ or /spot/123/)
    $('a[href*="spot/"]').each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;

      try {
        let fullUrl: string;
        if (href.startsWith("http")) {
          fullUrl = href;
        } else if (href.startsWith("/")) {
          fullUrl = new URL(href, "https://www.japan.travel").href;
        } else {
          fullUrl = new URL(href, this.config.baseUrl).href;
        }
        
        // Only include spot detail pages (with numeric ID)
        if (fullUrl.match(/\/spot\/\d+\/?$/)) {
          if (!links.includes(fullUrl)) {
            links.push(fullUrl);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    // Extract destination links (format: destinations/region/prefecture/city/)
    $('a[href*="destinations/"]').each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;

      try {
        let fullUrl: string;
        if (href.startsWith("http")) {
          fullUrl = href;
        } else if (href.startsWith("/")) {
          fullUrl = new URL(href, "https://www.japan.travel").href;
        } else {
          fullUrl = new URL(href, this.config.baseUrl).href;
        }
        
        // Include destination detail pages (3+ path segments)
        // Exclude index pages like /destinations/ or /destinations/region/
        const pathParts = new URL(fullUrl).pathname.split("/").filter(Boolean);
        if (
          pathParts.length >= 3 &&
          pathParts[0] === "destinations" &&
          !fullUrl.match(/\/destinations\/[^/]+\/?$/)
        ) {
          if (!links.includes(fullUrl)) {
            links.push(fullUrl);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return links;
  }

  /**
   * Scrape individual location detail page
   */
  private async scrapeLocationDetailPage(
    url: string,
    region: string,
    category?: string,
    $?: cheerio.CheerioAPI,
  ): Promise<void> {
    try {
      // Check within-JNTO duplicate by URL first (fastest check)
      if (this.isDuplicateWithinJNTO(url, "")) {
        this.skippedDuplicates++;
        return;
      }

      // Fetch page if not already provided
      if (!$) {
        $ = await this.fetchHtml(url);
      }

      // Extract location name - JNTO uses h1 with format "Name 日本語"
      const h1Text = $("h1").first().text().trim();
      let name = "";
      
      if (h1Text) {
        const words = h1Text.split(/\s+/);
        // If first word is short (< 8 chars) and there's a second word, include it
        // This handles cases like "Keichiku Kagura" where we want both words
        if (words[0].length < 8 && words.length > 1) {
          name = words.slice(0, 2).join(" "); // Take first 2 words
        } else {
          name = words[0]; // Just first word
        }
      }
      
      if (!name) {
        name =
          $('meta[property="og:title"]').attr("content") ||
          $("title").text().trim() ||
          "";
      }

      if (!name) {
        this.logWarning(`No name found for location at ${url}`);
        return;
      }

      // Check duplicate again with name (more thorough check)
      if (this.isDuplicateWithinJNTO(url, name)) {
        this.skippedDuplicates++;
        return;
      }

      // Extract description - JNTO has content in paragraphs
      let description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        "";

      if (!description) {
        // Get first paragraph from main content
        const firstParagraph = $("main p, .content p, article p")
          .first()
          .text()
          .trim();
        if (firstParagraph && firstParagraph.length > 50) {
          description = firstParagraph;
        }
      }

      // Extract category if not provided
      let finalCategory = category || "attraction";
      if (!category) {
        // Check for keywords/category links first (most reliable)
        const categoryLink = $('a[href*="travel-directory/"]').first().text().trim();
        if (categoryLink) {
          finalCategory = this.normalizeCategory(categoryLink);
        } else {
          // Check keywords section
          const keywordsText = $(".keywords, [class*='keyword'], [id*='keyword'], [data-keywords]")
            .text()
            .toLowerCase();
          
          if (keywordsText.includes("festival") || keywordsText.includes("event")) {
            finalCategory = "culture";
          } else if (keywordsText.includes("nature") || keywordsText.includes("outdoor")) {
            finalCategory = "nature";
          } else {
            // Check description and page content first (more reliable than breadcrumbs)
            const mainText = $("main, article").text().toLowerCase();
            const pageText = (description.toLowerCase() + " " + mainText).toLowerCase();
            const nameLower = name.toLowerCase();
            
            // Check for culture indicators (check name and description first)
            if (
              nameLower.includes("temple") || nameLower.includes("shrine") || nameLower.includes("festival") ||
              pageText.includes("temple") || pageText.includes("shrine") || pageText.includes("kabuki") || 
              pageText.includes("festival") || pageText.includes("matsuri") || pageText.includes("cultural") || 
              pageText.includes("heritage") || pageText.includes("historic") || pageText.includes("kagura") || 
              pageText.includes("theatre") || pageText.includes("theater") || pageText.includes("shinto")
            ) {
              finalCategory = "culture";
            } 
            // Check for nature indicators
            else if (
              nameLower.includes("park") || nameLower.includes("peninsula") ||
              pageText.includes("park") || pageText.includes("nature") || pageText.includes("mountain") || 
              pageText.includes("beach") || pageText.includes("outdoor") || pageText.includes("hiking") || 
              pageText.includes("natural beauty") || pageText.includes("peninsula") || pageText.includes("wild")
            ) {
              finalCategory = "nature";
            } 
            // Check for food indicators (be more specific to avoid false positives)
            else if (
              pageText.includes("restaurant") || pageText.includes("dining") || pageText.includes("cuisine") ||
              (pageText.includes("food") && (pageText.includes("restaurant") || pageText.includes("dining") || pageText.includes("cuisine")))
            ) {
              finalCategory = "food";
            } 
            // Check for shopping indicators
            else if (pageText.includes("shopping") || pageText.includes("market")) {
              finalCategory = "shopping";
            } 
            // Fallback to breadcrumbs
            else {
              const breadcrumbText = $("nav[aria-label='breadcrumb'], .breadcrumb").text().toLowerCase();
              if (breadcrumbText.includes("nature") || breadcrumbText.includes("outdoor") || breadcrumbText.includes("park")) {
                finalCategory = "nature";
              } else if (breadcrumbText.includes("culture") || breadcrumbText.includes("temple") || breadcrumbText.includes("shrine") || breadcrumbText.includes("festival") || breadcrumbText.includes("event")) {
                finalCategory = "culture";
              } else if (breadcrumbText.includes("food") || breadcrumbText.includes("restaurant") || breadcrumbText.includes("eat")) {
                finalCategory = "food";
              }
              // Otherwise keep default "attraction"
            }
          }
        }
      }

      // Extract prefecture and city from location info
      let prefecture: string | undefined;
      let city: string | undefined;

      // JNTO shows location as "City, Prefecture-ken" or "City, City-gun, Prefecture-ken" format
      const locationText = $("p:contains(',')").first().text().trim();
      if (locationText) {
        // Try 3-part format first: "City, City-gun, Prefecture-ken"
        const threePartMatch = locationText.match(/([^,]+),\s*([^,]+)-gun,\s*([^-]+)-ken/);
        if (threePartMatch) {
          city = threePartMatch[1].trim();
          prefecture = threePartMatch[3].trim() + " Prefecture";
        } else {
          // Try 2-part format: "City, Prefecture-ken"
          const twoPartMatch = locationText.match(/([^,]+),\s*([^-]+)-ken/);
          if (twoPartMatch) {
            city = twoPartMatch[1].trim();
            prefecture = twoPartMatch[2].trim() + " Prefecture";
          }
        }
      }

      // Try to extract from breadcrumbs (format: Region > Prefecture > City)
      const breadcrumbs = $("nav[aria-label='breadcrumb'] a, .breadcrumb a")
        .map((_, el) => $(el).text().trim())
        .get();
      
      // Infer region from breadcrumbs first
      let finalRegion = region;
      if (breadcrumbs.length > 0) {
        const regionBreadcrumb = breadcrumbs.find((b) =>
          ["Tohoku", "Kanto", "Kansai", "Kyushu", "Hokkaido", "Chubu", "Chugoku", "Shikoku", "Okinawa"].includes(b),
        );
        if (regionBreadcrumb) {
          finalRegion = regionBreadcrumb;
        }
      }
      
      if (breadcrumbs.length >= 2) {
        // Last breadcrumb is usually the city/area
        const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
        if (!city && lastBreadcrumb && !lastBreadcrumb.match(/^(Tohoku|Kanto|Kansai|Kyushu|Hokkaido|Chubu|Chugoku|Shikoku|Okinawa)$/i)) {
          city = lastBreadcrumb;
        }
        // Second to last might be prefecture
        if (breadcrumbs.length >= 3 && !prefecture) {
          prefecture = breadcrumbs[breadcrumbs.length - 2] + " Prefecture";
        }
      }

      // Create location object
      const location: Omit<ScrapedLocation, "scrapedAt" | "note" | "source"> = {
        name: this.cleanText(name),
        category: finalCategory,
        region: finalRegion,
        prefecture: prefecture || undefined,
        city: city || undefined,
        sourceUrl: url,
        description: description ? this.cleanText(description) : undefined,
      };

      // Check database duplicate
      const dbCheck = await this.isDuplicateInDatabase(location);
      if (dbCheck.isDuplicate) {
        this.log(`Skipping duplicate: ${name} (${dbCheck.reason})`);
        this.skippedDuplicates++;
        return;
      }

      // Mark as seen and add location
      this.markAsSeen(url, name);
      this.addLocation(location);
      this.stats.successfulScrapes++;
    } catch (error) {
      this.logError(`Failed to scrape location page ${url}`, error);
      this.stats.failedScrapes++;
    }
  }

  /**
   * Convert slug to region name
   */
  private slugToRegion(slug: string): string {
    const regionMap: Record<string, string> = {
      hokkaido: "Hokkaido",
      tohoku: "Tohoku",
      kanto: "Kanto",
      chubu: "Chubu",
      kansai: "Kansai",
      chugoku: "Chugoku",
      shikoku: "Shikoku",
      kyushu: "Kyushu",
      okinawa: "Okinawa",
    };
    return regionMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  /**
   * Convert slug to category
   */
  private slugToCategory(slug: string): string {
    const categoryMap: Record<string, string> = {
      "temples-shrines": "culture",
      museums: "culture",
      "parks-gardens": "nature",
      onsen: "nature",
      "food-drink": "food",
      shopping: "shopping",
      festivals: "culture",
      "outdoor-activities": "nature",
    };
    return categoryMap[slug] || "attraction";
  }

  /**
   * Infer region from city slug
   */
  private inferRegionFromCity(citySlug: string): string {
    const cityRegionMap: Record<string, string> = {
      tokyo: "Kanto",
      yokohama: "Kanto",
      kyoto: "Kansai",
      osaka: "Kansai",
      sapporo: "Hokkaido",
      hiroshima: "Chugoku",
      fukuoka: "Kyushu",
    };
    return cityRegionMap[citySlug] || "Kanto";
  }

  /**
   * Infer region from URL (async version - fetches page)
   */
  private async inferRegionFromUrl(url: string): Promise<string> {
    // Try to extract region from URL path
    const regionMatch = url.match(/\/destinations\/([^/]+)/);
    if (regionMatch) {
      return this.slugToRegion(regionMatch[1]);
    }

    // Try to fetch page and extract region from content
    try {
      const $ = await this.fetchHtml(url);
      return this.inferRegionFromPage($, url);
    } catch {
      // Fallback
      return "Kanto";
    }
  }

  /**
   * Infer region from already-fetched page content
   */
  private inferRegionFromPage($: cheerio.CheerioAPI, url: string): string {
    // Try to extract region from URL path first
    const regionMatch = url.match(/\/destinations\/([^/]+)/);
    if (regionMatch) {
      return this.slugToRegion(regionMatch[1]);
    }

    // Try to extract from breadcrumbs (most reliable)
    const breadcrumbs = $("nav[aria-label='breadcrumb'] a, .breadcrumb a")
      .map((_, el) => $(el).text().trim())
      .get();
    
    if (breadcrumbs.length > 0) {
      const regionBreadcrumb = breadcrumbs.find((b) =>
        ["Tohoku", "Kanto", "Kansai", "Kyushu", "Hokkaido", "Chubu", "Chugoku", "Shikoku", "Okinawa"].includes(b),
      );
      if (regionBreadcrumb) {
        return regionBreadcrumb;
      }
    }

    // Try to extract from page content
    const regionText = $(".region, .area, [class*='region']").first().text().trim();
    if (regionText) {
      const knownRegions = [
        "Hokkaido",
        "Tohoku",
        "Kanto",
        "Chubu",
        "Kansai",
        "Chugoku",
        "Shikoku",
        "Kyushu",
        "Okinawa",
      ];
      for (const region of knownRegions) {
        if (regionText.includes(region)) {
          return region;
        }
      }
    }

    // Try to infer from prefecture if available
    const prefectureText = $("p:contains('Prefecture'), p:contains('-ken')").first().text();
    if (prefectureText) {
      // Map prefectures to regions
      const prefectureRegionMap: Record<string, string> = {
        "Fukuoka": "Kyushu",
        "Shiga": "Kansai",
        "Hyogo": "Kansai",
        "Ehime": "Shikoku",
        "Kagoshima": "Kyushu",
        "Hokkaido": "Hokkaido",
        "Aomori": "Tohoku",
        "Iwate": "Tohoku",
        "Miyagi": "Tohoku",
        "Akita": "Tohoku",
        "Yamagata": "Tohoku",
        "Fukushima": "Tohoku",
        "Tokyo": "Kanto",
        "Kanagawa": "Kanto",
        "Chiba": "Kanto",
        "Saitama": "Kanto",
        "Ibaraki": "Kanto",
        "Tochigi": "Kanto",
        "Gunma": "Kanto",
        "Niigata": "Chubu",
        "Toyama": "Chubu",
        "Ishikawa": "Chubu",
        "Fukui": "Chubu",
        "Yamanashi": "Chubu",
        "Nagano": "Chubu",
        "Gifu": "Chubu",
        "Shizuoka": "Chubu",
        "Aichi": "Chubu",
        "Mie": "Kansai",
        "Kyoto": "Kansai",
        "Osaka": "Kansai",
        "Nara": "Kansai",
        "Wakayama": "Kansai",
        "Tottori": "Chugoku",
        "Shimane": "Chugoku",
        "Okayama": "Chugoku",
        "Hiroshima": "Chugoku",
        "Yamaguchi": "Chugoku",
        "Tokushima": "Shikoku",
        "Kagawa": "Shikoku",
        "Kochi": "Shikoku",
        "Saga": "Kyushu",
        "Nagasaki": "Kyushu",
        "Kumamoto": "Kyushu",
        "Oita": "Kyushu",
        "Miyazaki": "Kyushu",
        "Okinawa": "Okinawa",
      };

      for (const [pref, region] of Object.entries(prefectureRegionMap)) {
        if (prefectureText.includes(pref)) {
          return region;
        }
      }
    }

    return "Kanto"; // Default fallback
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new JNTOScraper();
  scraper
    .run()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export default JNTOScraper;
