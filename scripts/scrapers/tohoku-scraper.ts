#!/usr/bin/env tsx
/**
 * Tohoku Tourism Website Scraper
 *
 * Source: https://www.tohokukanko.jp/en/
 * Expected: 150-250 locations
 * Region: Tohoku
 *
 * This scraper extracts location data from the official Tohoku tourism website
 * for INTERNAL TESTING purposes only.
 *
 * Scraping Strategy:
 * - Main attractions page: /en/attractions/index.html
 * - Shows 40 results per page
 * - 3,031+ total results available
 * - We'll limit to first 6-7 pages (~240-280 locations) to stay within expected range
 * - Pagination pattern: index_[page]_2______0___.html
 * - Detail page pattern: detail_[ID].html
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";

export class TohokuScraper extends BaseScraper {
  // Tohoku prefectures for validation
  private readonly TOHOKU_PREFECTURES = [
    "Aomori",
    "Iwate",
    "Miyagi",
    "Akita",
    "Yamagata",
    "Fukushima",
  ];

  constructor() {
    super({
      name: "tohoku_tourism",
      baseUrl: "https://www.tohokukanko.jp/en/",
      region: "Tohoku",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // Start with the attractions index page
      const attractionsUrl = `${this.config.baseUrl}attractions/index.html`;

      // First page (index.html or index_1_2______0___.html)
      const $ = await this.fetchHtml(attractionsUrl);

      // Scrape the first page
      await this.scrapePage($, attractionsUrl, 1);

      // Based on analysis: 3,031 total results, 40 per page
      // We want 150-250 locations, so scrape 4-6 pages
      // Let's go with 6 pages = ~240 locations
      const maxPages = 6;

      // Scrape remaining pages
      for (let page = 2; page <= maxPages; page++) {
        await this.delay();

        const pageUrl = `${this.config.baseUrl}attractions/index_${page}_2______0___.html`;
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
   * Scrape a single page of locations
   */
  private async scrapePage(
    $: cheerio.CheerioAPI,
    pageUrl: string,
    pageNumber: number,
  ): Promise<void> {
    this.log(`Scraping page ${pageNumber}...`);

    // Find all h3 headings which contain the attraction names
    // Each attraction has structure: <h3>Name</h3><p>Prefecture</p><p>Description</p><a href="detail_X.html">View Details</a>
    const headings = $("h3");

    if (headings.length === 0) {
      this.logWarning(`No locations found on page ${pageNumber}`);
      return;
    }

    this.log(`Found ${headings.length} locations on page ${pageNumber}`);

    // Process each location
    headings.each((index, element) => {
      try {
        const $heading = $(element);

        // Extract name from h3
        const name = this.cleanText($heading.text());

        if (!name || name.length < 2) {
          return;
        }

        // Get the parent container that holds all the attraction info
        const $container = $heading.parent();

        // Find the detail link (should be after the heading in the same container)
        const $detailLink = $container.find('a[href^="detail_"]').first();
        const href = $detailLink.attr("href") || "";

        if (!href) {
          this.logWarning(`No detail link found for: ${name}`);
          return;
        }

        // Build full URL
        const detailUrl = href.startsWith("http")
          ? href
          : `${this.config.baseUrl}attractions/${href.replace(/^\.\//, "")}`;

        // Extract prefecture - it's usually in the first <p> after the h3
        let prefecture = "";
        const $paragraphs = $container.find("p");

        if ($paragraphs.length > 0) {
          const firstPara = this.cleanText($paragraphs.eq(0).text());
          // Check if first paragraph is a prefecture name
          for (const pref of this.TOHOKU_PREFECTURES) {
            if (firstPara === pref || firstPara.includes(pref)) {
              prefecture = pref;
              break;
            }
          }
        }

        // Extract description - usually in the second <p> or first <p> if not a prefecture
        let description = "";
        if ($paragraphs.length > 0) {
          if (prefecture) {
            // If we found prefecture in first p, description is in second p
            if ($paragraphs.length > 1) {
              description = this.cleanText($paragraphs.eq(1).text());
            }
          } else {
            // First p is the description
            description = this.cleanText($paragraphs.eq(0).text());
          }
        }

        // If we still don't have prefecture, try to infer from description or check siblings
        if (!prefecture) {
          const containerText = $container.text();
          for (const pref of this.TOHOKU_PREFECTURES) {
            if (containerText.includes(pref)) {
              prefecture = pref;
              break;
            }
          }
        }

        // Determine category from name and description
        const category = this.inferCategory(name, description);

        // Add location
        this.addLocation({
          name,
          category,
          region: this.config.region,
          prefecture: prefecture || undefined,
          city: undefined, // City info would require scraping detail pages
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

  /**
   * Infer category from name and description
   */
  private inferCategory(name: string, description: string): string {
    const text = `${name} ${description}`.toLowerCase();

    // Nature indicators
    if (
      text.includes("onsen") ||
      text.includes("hot spring") ||
      text.includes("mountain") ||
      text.includes("lake") ||
      text.includes("river") ||
      text.includes("waterfall") ||
      text.includes("park") ||
      text.includes("nature") ||
      text.includes("garden") ||
      text.includes("gorge") ||
      text.includes("valley") ||
      text.includes("beach") ||
      text.includes("coast")
    ) {
      return "nature";
    }

    // Culture indicators
    if (
      text.includes("temple") ||
      text.includes("shrine") ||
      text.includes("museum") ||
      text.includes("castle") ||
      text.includes("historic") ||
      text.includes("heritage") ||
      text.includes("traditional") ||
      text.includes("festival") ||
      text.includes("samurai") ||
      text.includes("edo") ||
      text.includes("cultural")
    ) {
      return "culture";
    }

    // Food indicators
    if (
      text.includes("restaurant") ||
      text.includes("food") ||
      text.includes("cuisine") ||
      text.includes("market") ||
      text.includes("dining")
    ) {
      return "food";
    }

    // Shopping indicators
    if (
      text.includes("shopping") ||
      text.includes("market") ||
      text.includes("shop") ||
      text.includes("mall")
    ) {
      return "shopping";
    }

    // Attraction indicators (aquarium, zoo, theme park, etc.)
    if (
      text.includes("aquarium") ||
      text.includes("zoo") ||
      text.includes("theme park") ||
      text.includes("entertainment") ||
      text.includes("observation") ||
      text.includes("tower")
    ) {
      return "attraction";
    }

    // Default to attraction
    return "attraction";
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new TohokuScraper();
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

export default TohokuScraper;
