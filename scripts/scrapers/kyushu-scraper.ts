#!/usr/bin/env tsx
/**
 * Kyushu Tourism Website Scraper
 *
 * Source: https://www.visit-kyushu.com/en/
 * Expected: 250-350 locations
 * Region: Kyushu
 *
 * This scraper extracts location data from the official Kyushu tourism website
 * for INTERNAL TESTING purposes only.
 *
 * Strategy:
 * 1. Scrape all 6 category pages under /en/see-and-do/
 * 2. Extract spot URLs from each category page
 * 3. Visit each spot detail page to extract full location data
 * 4. Extract prefecture, city, category, and other metadata from detail pages
 *
 * Categories:
 * - activities-and-experiences
 * - art-and-culture
 * - heritage-and-history
 * - wellness-and-relaxation
 * - nature-and-outdoors
 * - leisure-and-entertainment
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";

export class KyushuScraper extends BaseScraper {
  private readonly categories = [
    "activities-and-experiences",
    "art-and-culture",
    "heritage-and-history",
    "wellness-and-relaxation",
    "nature-and-outdoors",
    "leisure-and-entertainment",
  ];

  // Map category slugs to our standard categories
  private readonly categoryMapping: Record<string, string> = {
    "activities-and-experiences": "attraction",
    "art-and-culture": "culture",
    "heritage-and-history": "culture",
    "wellness-and-relaxation": "nature",
    "nature-and-outdoors": "nature",
    "leisure-and-entertainment": "attraction",
  };

  // Kyushu prefectures for validation
  private readonly kyushuPrefectures = [
    "Fukuoka",
    "Saga",
    "Nagasaki",
    "Kumamoto",
    "Oita",
    "Miyazaki",
    "Kagoshima",
    "Okinawa", // Sometimes included in Kyushu tourism
  ];

  constructor() {
    super({
      name: "kyushu_tourism",
      baseUrl: "https://www.visit-kyushu.com/en/",
      region: "Kyushu",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // Set to track unique spot URLs across all categories
      const uniqueSpotUrls = new Set<string>();

      // Phase 1: Collect all spot URLs from category pages
      this.log("Phase 1: Collecting spot URLs from category pages...");

      for (const category of this.categories) {
        await this.delay();

        const categoryUrl = `${this.config.baseUrl}see-and-do/${category}/`;
        this.log(`Scraping category: ${category}`);

        try {
          const $ = await this.fetchHtml(categoryUrl);
          const spotUrls = this.extractSpotUrls($);

          spotUrls.forEach(url => uniqueSpotUrls.add(url));
          this.log(`  Found ${spotUrls.length} spots in ${category} (${uniqueSpotUrls.size} total unique)`);
        } catch (error) {
          this.logError(`Failed to scrape category ${category}`, error);
          this.stats.failedScrapes++;
        }
      }

      this.log(`\nPhase 1 Complete: Found ${uniqueSpotUrls.size} unique spot URLs`);
      this.log("Phase 2: Scraping individual spot pages...\n");

      // Phase 2: Scrape each spot detail page
      let processedCount = 0;
      for (const spotUrl of Array.from(uniqueSpotUrls)) {
        await this.delay();
        processedCount++;

        try {
          const fullUrl = spotUrl.startsWith("http")
            ? spotUrl
            : `https://www.visit-kyushu.com${spotUrl}`;

          this.log(`[${processedCount}/${uniqueSpotUrls.size}] Scraping: ${fullUrl}`);

          const $ = await this.fetchHtml(fullUrl);
          await this.scrapeSpotPage($, fullUrl);
          this.stats.successfulScrapes++;
        } catch (error) {
          this.logError(`Failed to scrape spot ${spotUrl}`, error);
          this.stats.failedScrapes++;
        }
      }

      this.logSuccess(
        `Scraped ${this.stats.successfulScrapes} locations from ${this.config.name}`,
      );
      return this.locations;
    } catch (error) {
      this.logError("Fatal error during scraping", error);
      throw error;
    }
  }

  /**
   * Extract all spot URLs from a category page
   */
  private extractSpotUrls($: cheerio.CheerioAPI): string[] {
    const urls: string[] = [];

    // Find all links that match the spots pattern
    $('a[href*="/see-and-do/spots/"]').each((_, element) => {
      const href = $(element).attr("href");
      if (href && !href.includes("#") && !urls.includes(href)) {
        urls.push(href);
      }
    });

    return urls;
  }

  /**
   * Scrape data from an individual spot detail page
   */
  private async scrapeSpotPage(
    $: cheerio.CheerioAPI,
    url: string,
  ): Promise<void> {
    try {
      // Extract name from the specific location name element
      let name = this.cleanText($(".mod__spot-info--name-en").first().text());
      if (!name) {
        // Fallback to h2 if the specific class isn't found
        name = this.cleanText($("h2").first().text());
      }

      // Remove Japanese text in parentheses if present
      name = name.replace(/[（(][\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]+[）)]/g, "").trim();

      if (!name) {
        this.logWarning(`No name found for spot at ${url}`);
        return;
      }

      // Extract description from the main text area
      const description = this.cleanText(
        $(".mod__spot-info--txt .font--01, .mod__spot-info--txt p").first().text()
      );

      // Extract prefecture and city from address
      let prefecture = "";
      let city = "";

      // Look for address section with icon
      const addressText = this.cleanText(
        $('img[alt="Address"], img[alt*="address"]')
          .parent()
          .text()
      );

      if (addressText) {
        // Extract prefecture (e.g., "Fukuoka Prefecture", "Nagasaki Prefecture")
        for (const pref of this.kyushuPrefectures) {
          if (addressText.includes(pref)) {
            prefecture = pref;
            break;
          }
        }

        // Extract city (usually comes before "city" or after prefecture)
        const cityMatch = addressText.match(/([A-Za-z\s]+)\s+city/i);
        if (cityMatch) {
          city = this.cleanText(cityMatch[1]);
        }
      }

      // Try to extract prefecture from breadcrumb or tags if not found in address
      if (!prefecture) {
        $('a[href*="/destinations/"]').each((_, element) => {
          const href = $(element).attr("href") || "";
          for (const pref of this.kyushuPrefectures) {
            if (href.toLowerCase().includes(pref.toLowerCase())) {
              prefecture = pref;
              return false; // break
            }
          }
        });
      }

      // Extract category from tag links
      let category = "attraction"; // default
      const categoryLinks = $('a[href*="/see-and-do/"], a[href*="/travel-directory/"]');

      categoryLinks.each((_, element) => {
        const href = $(element).attr("href") || "";
        const text = this.cleanText($(element).text()).toLowerCase();

        // Match against our category mapping
        for (const [slug, cat] of Object.entries(this.categoryMapping)) {
          if (href.includes(slug) || text.includes(slug.replace(/-/g, " "))) {
            category = cat;
            return false; // break
          }
        }

        // Also check text content for category keywords
        if (
          text.includes("nature") ||
          text.includes("outdoor") ||
          text.includes("park") ||
          text.includes("mountain")
        ) {
          category = "nature";
          return false;
        } else if (
          text.includes("culture") ||
          text.includes("art") ||
          text.includes("heritage") ||
          text.includes("history") ||
          text.includes("museum") ||
          text.includes("shrine") ||
          text.includes("temple")
        ) {
          category = "culture";
          return false;
        }
      });

      // Add the location
      this.addLocation({
        name,
        category,
        region: this.config.region,
        prefecture: prefecture || undefined,
        city: city || undefined,
        sourceUrl: url,
        description: description || undefined,
      });

      this.log(`  ✓ ${name} (${prefecture || "unknown"})`);
    } catch (error) {
      this.logError(`Failed to parse spot page ${url}`, error);
      throw error;
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new KyushuScraper();
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

export default KyushuScraper;
