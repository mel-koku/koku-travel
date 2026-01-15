#!/usr/bin/env tsx
/**
 * Chugoku Region Tourism Website Scraper
 *
 * Source: https://www.into-you.jp/en/top/
 * Expected: 150-200 locations
 * Region: Chugoku
 *
 * This scraper extracts location data from the official Chugoku tourism website
 * for INTERNAL TESTING purposes only.
 *
 * Chugoku Region includes prefectures:
 * - Tottori
 * - Shimane
 * - Okayama
 * - Hiroshima
 * - Yamaguchi
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";

export class ChugokuScraper extends BaseScraper {
  // Prefecture mapping for the Chugoku region
  private readonly prefectures = [
    "tottori",
    "shimane",
    "okayama",
    "hiroshima",
    "yamaguchi",
  ];

  // Prefecture name mapping (URL slug -> proper name)
  private readonly prefectureNames: Record<string, string> = {
    tottori: "Tottori",
    shimane: "Shimane",
    okayama: "Okayama",
    hiroshima: "Hiroshima",
    yamaguchi: "Yamaguchi",
  };

  constructor() {
    super({
      name: "chugoku_tourism",
      baseUrl: "https://www.into-you.jp/en/",
      region: "Chugoku",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // Strategy: Scrape from prefecture-specific pages to get better location data
      // This is more reliable than the main list page and provides prefecture context
      for (const prefecture of this.prefectures) {
        await this.scrapePrefecture(prefecture);
        await this.delay();
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
   * Scrape all locations for a specific prefecture
   */
  private async scrapePrefecture(prefecture: string): Promise<void> {
    try {
      this.log(`\n${"=".repeat(60)}`);
      this.log(`Scraping prefecture: ${this.prefectureNames[prefecture]}`);
      this.log("=".repeat(60));

      // Start with page 1
      const firstPageUrl = `${this.config.baseUrl}places/?area=search&pref=${prefecture}`;
      const $ = await this.fetchHtml(firstPageUrl);

      // Determine total pages for this prefecture
      const totalPages = this.extractTotalPages($);
      this.log(
        `Found ${totalPages} page(s) for ${this.prefectureNames[prefecture]}`,
      );

      // Scrape first page
      await this.scrapePage($, prefecture, 1);

      // Scrape remaining pages (limit to first 2 pages per prefecture to reach ~150-200 total)
      const maxPages = Math.min(totalPages, 2);
      for (let page = 2; page <= maxPages; page++) {
        await this.delay();

        const pageUrl = `${this.config.baseUrl}places/page/${page}/?area=search&pref=${prefecture}`;
        try {
          const $page = await this.fetchHtml(pageUrl);
          await this.scrapePage($page, prefecture, page);
        } catch (error) {
          this.logError(
            `Failed to scrape page ${page} for ${this.prefectureNames[prefecture]}`,
            error,
          );
          this.stats.failedScrapes++;
        }
      }
    } catch (error) {
      this.logError(`Failed to scrape prefecture ${prefecture}`, error);
    }
  }

  /**
   * Extract total number of pages from pagination
   */
  private extractTotalPages($: cheerio.CheerioAPI): number {
    // Look for pagination links
    // The site uses numbered page links and "Next" button
    const pageLinks = $('a[href*="/page/"]')
      .map((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/\/page\/(\d+)\//);
        return match ? parseInt(match[1], 10) : 0;
      })
      .get();

    if (pageLinks.length > 0) {
      return Math.max(...pageLinks);
    }

    // Check for Japanese pagination text (最後 = last)
    const lastPageLink = $('a:contains("最後"), a:contains("Last")').attr("href");
    if (lastPageLink) {
      const match = lastPageLink.match(/\/page\/(\d+)\//);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Default to 1 page if no pagination found
    return 1;
  }

  /**
   * Scrape a single page of locations for a prefecture
   */
  private async scrapePage(
    $: cheerio.CheerioAPI,
    prefecture: string,
    pageNumber: number,
  ): Promise<void> {
    this.log(`  Scraping page ${pageNumber}...`);

    // Find all location links
    // Based on analysis, links to places are in format: /en/places/[ID]/
    const locationLinks = $('a[href*="/en/places/"]').filter((_, el) => {
      const href = $(el).attr("href") || "";
      // Filter for detail pages (have numeric ID), exclude other pages
      return /\/en\/places\/\d+\/?$/.test(href);
    });

    if (locationLinks.length === 0) {
      this.logWarning(
        `  No locations found on page ${pageNumber} for ${this.prefectureNames[prefecture]}`,
      );
      return;
    }

    this.log(`  Found ${locationLinks.length} locations on page ${pageNumber}`);

    // Track unique URLs to avoid duplicates on the same page
    const processedUrls = new Set<string>();

    locationLinks.each((index, element) => {
      try {
        const $element = $(element);

        // Extract detail URL
        const href = $element.attr("href") || "";
        if (!href) {
          return;
        }

        // Build full URL
        const detailUrl = href.startsWith("http")
          ? href
          : `https://www.into-you.jp${href.replace(/^\./, "")}`;

        // Skip if already processed
        if (processedUrls.has(detailUrl)) {
          return;
        }
        processedUrls.add(detailUrl);

        // Extract name and description from link text
        const fullText = this.cleanText($element.text());

        // Filter out navigation text and non-location links
        const skipPatterns = [
          /^next$/i,
          /^previous$/i,
          /^page \d+$/i,
          /^\d+$/,
          /^最後$/,
          /^read more$/i,
          /^view all$/i,
          /^see all$/i,
        ];

        if (
          !fullText ||
          skipPatterns.some((pattern) => pattern.test(fullText))
        ) {
          return;
        }

        let nameText = "";
        let description = "";

        // Strategy 1: Try to use image alt text as the name (most reliable)
        const imgAlt = $element.find("img").attr("alt");
        if (imgAlt && imgAlt.trim() && imgAlt !== "") {
          nameText = this.cleanText(imgAlt);
          description = fullText.replace(nameText, "").trim();
        } else {
          // Strategy 2: Parse the text content
          // Text pattern is usually: "Name Description [...]"
          // Split on double space, newline, or sentence boundary

          // Try to split on sentence boundaries or double spaces
          const sentences = fullText.split(/(?:\.\s+|\n|  +)/);

          if (sentences.length >= 2) {
            // First part is likely the name
            nameText = sentences[0].trim();
            description = sentences.slice(1).join(" ").replace(/\[…\]/, "").trim();
          } else {
            // Try to split on uppercase letter followed by lowercase (new word)
            // This catches patterns like "NameThe description starts here"
            const match = fullText.match(/^(.+?)(?:\s+(?:The|In|A|An|This|On|With|For|At)\s)/i);
            if (match && match[1]) {
              nameText = match[1].trim();
              description = fullText.substring(nameText.length).replace(/\[…\]/, "").trim();
            } else {
              // Last resort: use first 50 chars as name
              if (fullText.length > 50) {
                nameText = fullText.substring(0, 50).trim();
                description = fullText.substring(50).replace(/\[…\]/, "").trim();
              } else {
                nameText = fullText;
              }
            }
          }
        }

        // Clean up name - remove common suffixes and artifacts
        nameText = nameText
          .replace(/\[…\].*$/, "")
          .replace(/\s+$/, "")
          .trim();

        // Skip if name is too short or looks invalid
        if (nameText.length < 2) {
          return;
        }

        // Limit description length
        if (description && description.length > 500) {
          description = description.substring(0, 497) + "...";
        }

        // Try to extract category from URL or context
        let category = "attraction"; // default

        // Look for category indicators in the parent element or description
        const contextText = `${nameText} ${description}`.toLowerCase();

        if (
          contextText.includes("temple") ||
          contextText.includes("shrine") ||
          contextText.includes("castle") ||
          contextText.includes("museum") ||
          contextText.includes("heritage")
        ) {
          category = "culture";
        } else if (
          contextText.includes("park") ||
          contextText.includes("mountain") ||
          contextText.includes("garden") ||
          contextText.includes("island") ||
          contextText.includes("beach") ||
          contextText.includes("nature") ||
          contextText.includes("gorge") ||
          contextText.includes("valley")
        ) {
          category = "nature";
        } else if (
          contextText.includes("restaurant") ||
          contextText.includes("food") ||
          contextText.includes("cuisine") ||
          contextText.includes("market")
        ) {
          category = "food";
        } else if (
          contextText.includes("shop") ||
          contextText.includes("shopping") ||
          contextText.includes("store")
        ) {
          category = "shopping";
        }

        // Extract city from description or use prefecture as fallback
        // Common cities in Chugoku region
        const cities = [
          "Hiroshima",
          "Okayama",
          "Kurashiki",
          "Matsue",
          "Izumo",
          "Tottori",
          "Yamaguchi",
          "Shimonoseki",
          "Onomichi",
          "Fukuyama",
        ];

        let city = "";
        for (const cityName of cities) {
          if (
            contextText.includes(cityName.toLowerCase()) ||
            nameText.toLowerCase().includes(cityName.toLowerCase())
          ) {
            city = cityName;
            break;
          }
        }

        // Add location
        this.addLocation({
          name: nameText,
          category,
          region: this.config.region,
          prefecture: this.prefectureNames[prefecture],
          city: city || undefined,
          sourceUrl: detailUrl,
          description: description || undefined,
        });

        this.stats.successfulScrapes++;
      } catch (error) {
        this.logError(
          `Failed to parse location ${index} on page ${pageNumber} for ${this.prefectureNames[prefecture]}`,
          error,
        );
        this.stats.failedScrapes++;
      }
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new ChugokuScraper();
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

export default ChugokuScraper;
