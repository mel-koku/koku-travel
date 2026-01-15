#!/usr/bin/env tsx
/**
 * Shikoku Tourism Website Scraper
 *
 * Source: https://shikoku-tourism.com/en/
 * Expected: 150-250 locations
 * Region: Shikoku
 *
 * This scraper extracts location data from the official Shikoku tourism website
 * for INTERNAL TESTING purposes only.
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";
import * as cheerio from "cheerio";

export class ShikokuScraper extends BaseScraper {
  constructor() {
    super({
      name: "shikoku_tourism",
      baseUrl: "https://shikoku-tourism.com/en/",
      region: "Shikoku",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // Start with the see-and-do page
      const baseUrl = `${this.config.baseUrl}see-and-do`;
      const $ = await this.fetchHtml(baseUrl);

      // Extract total number of pages from pagination
      const totalPages = this.extractTotalPages($);
      this.log(`Found ${totalPages} pages to scrape`);

      // Scrape the first page (already loaded)
      await this.scrapePage($, baseUrl, 1);

      // Scrape remaining pages
      // Based on 645 results / ~36-40 per page = ~17 pages, but we'll scrape up to 7 pages (~250 locations)
      for (let page = 2; page <= Math.min(totalPages, 7); page++) {
        await this.delay();

        const pageUrl = `${this.config.baseUrl}see-and-do/page:${page}`;
        try {
          const $page = await this.fetchHtml(pageUrl);
          await this.scrapePage($page, pageUrl, page);
        } catch (error) {
          this.logError(`Failed to scrape page ${page}`, error);
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
   * Extract total number of pages from pagination
   */
  private extractTotalPages($: cheerio.CheerioAPI): number {
    // Look for pagination links at the bottom of the page
    // The pagination shows numbered links like "1 2 3 4 5 6 7 8 9"
    const pageLinks = $('a[href*="/page:"]')
      .map((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/\/page:(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .get();

    if (pageLinks.length > 0) {
      return Math.max(...pageLinks);
    }

    // Look for text indicating total results (e.g., "645 results found")
    const resultsText = $("body").text();
    const resultsMatch = resultsText.match(/(\d+)\s+results?\s+found/i);
    if (resultsMatch) {
      const totalResults = parseInt(resultsMatch[1], 10);
      // Assume ~36-40 locations per page
      return Math.ceil(totalResults / 36);
    }

    // Default to 18 pages if we can't determine (645 results / 36 per page ≈ 18)
    return 18;
  }

  /**
   * Scrape a single page of locations
   */
  private async scrapePage(
    $: cheerio.CheerioAPI,
    pageUrl: string,
    pageNumber: number,
  ): Promise<void> {
    this.log(`Scraping page ${pageNumber}...`);

    // Find all location links
    // Links are in format: /en/see-and-do/[ID]
    const locationLinks = $('a[href^="/en/see-and-do/"]').filter((_, el) => {
      const href = $(el).attr("href") || "";
      // Filter to only detail pages (numeric IDs), not list pages
      return /\/en\/see-and-do\/\d+$/.test(href);
    });

    if (locationLinks.length === 0) {
      this.logWarning(`No locations found on page ${pageNumber}`);
      return;
    }

    this.log(`Found ${locationLinks.length} locations on page ${pageNumber}`);

    // Process each location link
    const processedUrls = new Set<string>();

    locationLinks.each((index, element) => {
      try {
        const $element = $(element);

        // Extract detail URL
        const href = $element.attr("href") || "";
        if (!href) {
          this.logWarning(`No href found for element ${index}`);
          return;
        }

        // Build full URL
        const detailUrl = href.startsWith("http")
          ? href
          : `https://shikoku-tourism.com${href}`;

        // Skip duplicates (multiple links to same location)
        if (processedUrls.has(detailUrl)) {
          return;
        }
        processedUrls.add(detailUrl);

        // Extract name from h3 tag within the link
        let name = this.cleanText($element.find("h3").text());

        if (!name) {
          // Try to find text content in the link
          name = this.cleanText($element.text());
        }

        if (!name) {
          this.logWarning(`No name found for location at ${detailUrl}`);
          return;
        }

        // For the listing page, we don't have detailed info
        // We'll mark these with basic info and rely on detail page scraping if needed
        // For now, we'll extract what we can from the listing

        // Try to extract prefecture from surrounding context or image alt text
        const imgAlt = $element.find("img").attr("alt") || "";
        let prefecture = this.extractPrefectureFromText(name + " " + imgAlt);

        // Add location with basic info
        this.addLocation({
          name: this.cleanText(name),
          category: this.inferCategoryFromName(name),
          region: this.config.region,
          prefecture: prefecture || undefined,
          city: undefined, // Will need detail page for city
          sourceUrl: detailUrl,
          description: undefined, // Will need detail page for description
        });

        this.stats.successfulScrapes++;
      } catch (error) {
        this.logError(`Failed to parse location ${index} on page ${pageNumber}`, error);
        this.stats.failedScrapes++;
      }
    });
  }

  /**
   * Extract prefecture from text (Ehime, Kagawa, Kochi, Tokushima)
   */
  private extractPrefectureFromText(text: string): string | null {
    const prefectures = ["Ehime", "Kagawa", "Kochi", "Tokushima"];

    for (const prefecture of prefectures) {
      if (text.includes(prefecture)) {
        return prefecture;
      }
    }

    return null;
  }

  /**
   * Infer category from location name
   */
  private inferCategoryFromName(name: string): string {
    const lowerName = name.toLowerCase();

    // Check for specific keywords
    if (
      lowerName.includes("temple") ||
      lowerName.includes("shrine") ||
      lowerName.includes("castle") ||
      lowerName.includes("museum") ||
      lowerName.includes("heritage")
    ) {
      return "culture";
    }

    if (
      lowerName.includes("onsen") ||
      lowerName.includes("hot spring") ||
      lowerName.includes("park") ||
      lowerName.includes("mountain") ||
      lowerName.includes("river") ||
      lowerName.includes("valley") ||
      lowerName.includes("bridge") ||
      lowerName.includes("cape") ||
      lowerName.includes("gorge") ||
      lowerName.includes("beach")
    ) {
      return "nature";
    }

    if (
      lowerName.includes("market") ||
      lowerName.includes("shopping") ||
      lowerName.includes("arcade")
    ) {
      return "shopping";
    }

    if (
      lowerName.includes("restaurant") ||
      lowerName.includes("food") ||
      lowerName.includes("dining") ||
      lowerName.includes("udon")
    ) {
      return "food";
    }

    // Default to attraction
    return "attraction";
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new ShikokuScraper();
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

export default ShikokuScraper;
