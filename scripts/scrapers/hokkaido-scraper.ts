#!/usr/bin/env tsx
/**
 * Hokkaido DMO Website Scraper
 *
 * Source: https://www.visit-hokkaido.jp/en/
 * Expected: 200-300 locations
 * Region: Hokkaido
 *
 * This scraper extracts location data from the official Hokkaido tourism website
 * for INTERNAL TESTING purposes only.
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";

export class HokkaidoScraper extends BaseScraper {
  constructor() {
    super({
      name: "hokkaido_dmo",
      baseUrl: "https://www.visit-hokkaido.jp/en/",
      region: "Hokkaido",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // Start with the spots index page
      const spotsUrl = `${this.config.baseUrl}spot/index.html`;
      const $ = await this.fetchHtml(spotsUrl);

      // First, determine how many pages we need to scrape
      // Looking for pagination information
      const totalPages = this.extractTotalPages($);
      this.log(`Found ${totalPages} pages to scrape`);

      // Scrape the first page (already loaded)
      await this.scrapePage($, spotsUrl, 1);

      // Scrape remaining pages
      for (let page = 2; page <= Math.min(totalPages, 15); page++) {
        // Limit to first 15 pages (~300 locations) as per expected count
        await this.delay();

        const pageUrl = `${this.config.baseUrl}spot/index.html?page=${page}`;
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
    // Try to find pagination info
    // Look for patterns like "1 of 30" or numbered page links
    const paginationText = $(".pagination, .pager, .page-numbers").text();
    const pageMatch = paginationText.match(/(\d+)\s*$/);
    if (pageMatch) {
      return parseInt(pageMatch[1], 10);
    }

    // Look for numbered page links
    const pageLinks = $('a[href*="?page="], a[href*="&page="]')
      .map((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/[?&]page=(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .get();

    if (pageLinks.length > 0) {
      return Math.max(...pageLinks);
    }

    // Default to 15 pages if we can't determine (586 total / 20 per page ≈ 30, but we'll limit to 15)
    return 15;
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

    // Find all location entries
    // Based on the analysis, we're looking for links to detail pages
    // Links are in format: detail_11270.html (relative paths in the spot directory)
    const locationLinks = $('a[href^="detail_"]');

    if (locationLinks.length === 0) {
      this.logWarning(`No locations found on page ${pageNumber}`);
      return;
    }

    this.log(`Found ${locationLinks.length} locations on page ${pageNumber}`);

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
          : `${this.config.baseUrl}spot/${href.replace(/^\.\//, "")}`;

        // Extract name from title attribute or nested img alt
        let name = $element.attr("title") || "";
        if (!name) {
          name = $element.find("img").attr("alt") || "";
        }
        if (!name) {
          // Try to find text content
          name = this.cleanText($element.text());
        }

        if (!name) {
          this.logWarning(`No name found for location at ${detailUrl}`);
          return;
        }

        // Extract area/city from parent container
        const $parent = $element.closest(".spot-item, .attraction-card, li, article");
        let area = "";
        let city = "";

        // Look for area text in the parent element
        const parentText = this.cleanText($parent.text());

        // Common area patterns in Hokkaido
        const areaPatterns = [
          /Area around ([^,\n]+)/i,
          /([^,\n]+) Area/i,
          /(Sapporo|Otaru|Asahikawa|Hakodate|Furano|Biei|Kushiro|Niseko|Noboribetsu)/i,
        ];

        for (const pattern of areaPatterns) {
          const match = parentText.match(pattern);
          if (match) {
            area = match[1] || match[0];
            city = area; // Use area as city for now
            break;
          }
        }

        // Try to extract category from parent or context
        let category = "attraction"; // default
        const categoryText = this.cleanText($parent.find(".category, .type, .tag").text());
        if (categoryText) {
          category = this.normalizeCategory(categoryText);
        } else {
          // Try to infer from name or description
          const description = this.cleanText($parent.find("p, .description").first().text());
          const contextText = `${name} ${description}`.toLowerCase();

          if (
            contextText.includes("temple") ||
            contextText.includes("shrine") ||
            contextText.includes("museum")
          ) {
            category = "culture";
          } else if (
            contextText.includes("park") ||
            contextText.includes("mountain") ||
            contextText.includes("pond") ||
            contextText.includes("lake")
          ) {
            category = "nature";
          } else if (
            contextText.includes("restaurant") ||
            contextText.includes("food") ||
            contextText.includes("market")
          ) {
            category = "food";
          }
        }

        // Extract description
        const description = this.cleanText($parent.find("p, .description").first().text());

        // Add location
        this.addLocation({
          name: this.cleanText(name),
          category,
          region: this.config.region,
          prefecture: "Hokkaido",
          city: city || undefined,
          sourceUrl: detailUrl,
          description: description || undefined,
        });

        this.stats.successfulScrapes++;
      } catch (error) {
        this.logError(`Failed to parse location ${index} on page ${pageNumber}`, error);
        this.stats.failedScrapes++;
      }
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new HokkaidoScraper();
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

export default HokkaidoScraper;
