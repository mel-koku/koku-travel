#!/usr/bin/env tsx
/**
 * Kansai Tourism Website Scraper
 *
 * Source: https://www.the-kansai-guide.com/en/
 * Expected: ~80-100 locations (website has curated selection, not comprehensive database)
 * Region: Kansai
 *
 * This scraper extracts location data from the official Kansai tourism website
 * for INTERNAL TESTING purposes only.
 *
 * Note: The Kansai Guide website features a curated selection of premium experiences
 * rather than a comprehensive database. The site has approximately 80-100 total unique
 * locations across all categories and prefectures.
 *
 * Scraping Strategy:
 * - Multiple category directories to maximize location coverage:
 *   1. /en/catalog/directory/tourist-attractions/ (~50 items, 5 pages)
 *   2. /en/catalog/directory/gourmet-experience/ (~50 items, 5 pages)
 *   3. /en/catalog/directory/traditional-crafts/ (~50 items, 5 pages)
 *   4. /en/catalog/directory/nature/ (~50 items, 5 pages)
 *   5. Prefecture-specific pages: osaka, kyoto, hyogo, nara, wakayama, shiga, mie
 * - CSS selectors: .gw-directoryLinks__item for attraction cards
 * - Pagination: .tkg-pager with numbered pages (~5 pages per category, 10 items/page)
 * - Target: All available unique locations (~80-100 total)
 * - Detail page pattern: /en/directory/item/[ID]/
 * - Deduplication: Track URLs to avoid duplicates across categories
 *
 * Website Structure:
 * - Uses .gw-directoryLinks__item for each attraction card
 * - Title in .gw-directoryLinks__title
 * - Category labels in .gw-directoryLinks__labels
 * - Description in .gw-directoryLinks__description
 * - Links in .gw-directoryLinks__directoryLink
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";

export class KansaiScraper extends BaseScraper {
  // Categories to scrape for comprehensive coverage
  private readonly CATEGORIES = [
    { path: "tourist-attractions", defaultCategory: "attraction" },
    { path: "gourmet-experience", defaultCategory: "food" },
    { path: "traditional-crafts", defaultCategory: "culture" },
    { path: "nature", defaultCategory: "nature" },
  ];

  // Major prefectures to scrape for additional locations
  private readonly PREFECTURE_PATHS = [
    "osaka",
    "kyoto",
    "hyogo",
    "nara",
    "wakayama",
    "shiga",
    "mie",
  ];
  // Kansai prefectures for validation and mapping
  private readonly KANSAI_PREFECTURES = [
    "Osaka",
    "Kyoto",
    "Hyogo",
    "Nara",
    "Wakayama",
    "Shiga",
    "Mie",
  ];

  // Common cities in Kansai for pattern matching
  private readonly KANSAI_CITIES = [
    // Osaka
    "Osaka City",
    "Osaka",
    "Sakai",
    "Higashiosaka",
    // Kyoto
    "Kyoto City",
    "Kyoto",
    "Uji",
    "Kameoka",
    // Hyogo
    "Kobe",
    "Himeji",
    "Nishinomiya",
    "Amagasaki",
    "Akashi",
    // Nara
    "Nara City",
    "Nara",
    "Kashihara",
    "Ikoma",
    // Wakayama
    "Wakayama City",
    "Wakayama",
    "Tanabe",
    "Shirahama",
    // Shiga
    "Otsu",
    "Hikone",
    "Nagahama",
    // Mie
    "Tsu",
    "Yokkaichi",
    "Suzuka",
    "Ise",
    "Matsusaka",
  ];

  constructor() {
    super({
      name: "kansai_guide",
      baseUrl: "https://www.the-kansai-guide.com/en/",
      region: "Kansai",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // Target is lower than initially expected because the website has a curated
      // selection rather than a comprehensive database. We'll scrape all available.
      const targetLocationCount = 200;

      // Scrape each category
      for (const category of this.CATEGORIES) {
        if (this.stats.totalLocations >= targetLocationCount) {
          this.log(`Reached target of ${targetLocationCount} locations, stopping`);
          break;
        }

        const directoryUrl = `${this.config.baseUrl}catalog/directory/${category.path}/`;
        this.log(`\nScraping category: ${category.path}`);
        this.log(`URL: ${directoryUrl}`);

        try {
          await this.scrapeCategory(directoryUrl, category.defaultCategory);
        } catch (error) {
          this.logError(`Failed to scrape category ${category.path}`, error);
        }

        // Add delay between categories
        if (this.stats.totalLocations < targetLocationCount) {
          await this.delay();
        }
      }

      // If we still need more locations, scrape prefecture-specific pages
      if (this.stats.totalLocations < targetLocationCount) {
        this.log(`\nCurrent total: ${this.stats.totalLocations}, scraping prefecture pages for more locations...`);

        for (const prefecture of this.PREFECTURE_PATHS) {
          if (this.stats.totalLocations >= targetLocationCount) {
            break;
          }

          const prefectureUrl = `${this.config.baseUrl}catalog/directory/${prefecture}/`;
          this.log(`\nScraping prefecture: ${prefecture}`);
          this.log(`URL: ${prefectureUrl}`);

          try {
            await this.scrapeCategory(prefectureUrl, "attraction");
          } catch (error) {
            this.logError(`Failed to scrape prefecture ${prefecture}`, error);
          }

          await this.delay();
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
   * Scrape a category or prefecture directory
   */
  private async scrapeCategory(
    directoryUrl: string,
    defaultCategory: string,
  ): Promise<void> {
    try {
      // First page
      const $ = await this.fetchHtml(directoryUrl);

      // Determine how many pages exist
      const totalPages = this.extractTotalPages($);
      this.log(`Found ${totalPages} pages in this category`);

      // Scrape the first page
      await this.scrapePage($, directoryUrl, 1, defaultCategory);

      // Scrape remaining pages (limit to reasonable number per category)
      const maxPagesPerCategory = Math.min(totalPages, 10);

      for (let page = 2; page <= maxPagesPerCategory; page++) {
        await this.delay();

        const pageUrl = `${directoryUrl}?page=${page}`;

        try {
          const $page = await this.fetchHtml(pageUrl);
          await this.scrapePage($page, pageUrl, page, defaultCategory);
        } catch (error) {
          this.logError(`Failed to scrape page ${page}`, error);
          this.stats.failedScrapes++;
        }
      }
    } catch (error) {
      this.logError(`Failed to scrape category ${directoryUrl}`, error);
      throw error;
    }
  }

  /**
   * Extract total number of pages from pagination
   */
  private extractTotalPages($: cheerio.CheerioAPI): number {
    // Look for .tkg-pager__number elements
    const pageNumbers = $(".tkg-pager__number")
      .map((_, el) => {
        const text = $(el).text().trim();
        const num = parseInt(text, 10);
        return isNaN(num) ? 0 : num;
      })
      .get();

    if (pageNumbers.length > 0) {
      const maxPage = Math.max(...pageNumbers);
      this.log(`Detected ${maxPage} pages from pagination`);
      return maxPage;
    }

    // Fallback: look for "next" link and estimate
    const hasNext = $(".tkg-pager__nextLink").length > 0;
    if (hasNext) {
      // Conservative estimate: assume at least 25 pages for Kansai
      return 25;
    }

    // Default to 20 pages if we can't determine
    return 20;
  }

  /**
   * Scrape a single page of locations
   */
  private async scrapePage(
    $: cheerio.CheerioAPI,
    pageUrl: string,
    pageNumber: number,
    defaultCategory: string,
  ): Promise<void> {
    this.log(`Scraping page ${pageNumber}...`);

    // Find all attraction items using the documented CSS selector
    const locationItems = $(".gw-directoryLinks__item");

    if (locationItems.length === 0) {
      this.logWarning(`No locations found on page ${pageNumber}`);
      return;
    }

    this.log(`Found ${locationItems.length} locations on page ${pageNumber}`);

    // Track URLs we've already seen to avoid duplicates across categories
    const seenUrls = new Set(this.locations.map((loc) => loc.sourceUrl));

    // Process each location
    locationItems.each((index, element) => {
      try {
        const $item = $(element);

        // Extract the main link (wraps the entire card)
        const $link = $item.find(".gw-directoryLinks__directoryLink").first();
        const href = $link.attr("href") || "";

        if (!href) {
          this.logWarning(`No link found for item ${index} on page ${pageNumber}`);
          return;
        }

        // Build full URL
        const detailUrl = href.startsWith("http")
          ? href
          : `${this.config.baseUrl.replace(/\/en\/$/, "")}${href}`;

        // Skip if we've already scraped this location
        if (seenUrls.has(detailUrl)) {
          return;
        }

        // Extract name from title element
        const name = this.cleanText($item.find(".gw-directoryLinks__title").text());

        if (!name || name.length < 2) {
          this.logWarning(`No valid name found for item ${index} on page ${pageNumber}`);
          return;
        }

        // Extract description
        const description = this.cleanText(
          $item.find(".gw-directoryLinks__description").text(),
        );

        // Extract category labels
        const labels = $item
          .find(".gw-directoryLinks__labels span, .gw-directoryLinks__labels div")
          .map((_, el) => this.cleanText($(el).text()))
          .get()
          .filter((label) => label.length > 0);

        // Determine category from labels or infer from name/description
        let category = defaultCategory; // use category from the directory we're scraping
        if (labels.length > 0) {
          // Use first label to determine category
          category = this.normalizeCategory(labels[0]);
        } else {
          // Infer from name and description
          category = this.inferCategory(name, description);
        }

        // Extract prefecture and city from description or name
        const { prefecture, city } = this.extractLocation(name, description);

        // Add location
        this.addLocation({
          name,
          category,
          region: this.config.region,
          prefecture: prefecture || undefined,
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

  /**
   * Extract prefecture and city from text
   */
  private extractLocation(
    name: string,
    description: string,
  ): { prefecture: string; city: string } {
    const text = `${name} ${description}`;

    let prefecture = "";
    let city = "";

    // Check for prefecture mentions
    for (const pref of this.KANSAI_PREFECTURES) {
      // Look for "Pref Prefecture" or "Pref-ken" or just "Pref"
      const patterns = [
        new RegExp(`${pref}\\s+Prefecture`, "i"),
        new RegExp(`${pref}-ken`, "i"),
        new RegExp(`\\b${pref}\\b`, "i"),
      ];

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          prefecture = pref;
          break;
        }
      }

      if (prefecture) break;
    }

    // Check for city mentions
    for (const cityName of this.KANSAI_CITIES) {
      const patterns = [
        new RegExp(`${cityName}\\s+City`, "i"),
        new RegExp(`${cityName}-shi`, "i"),
        new RegExp(`\\b${cityName}\\b`, "i"),
      ];

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          city = cityName;
          break;
        }
      }

      if (city) break;
    }

    // If we found a city but no prefecture, try to infer prefecture from city
    if (city && !prefecture) {
      if (city.includes("Osaka")) {
        prefecture = "Osaka";
      } else if (city.includes("Kyoto")) {
        prefecture = "Kyoto";
      } else if (city.includes("Kobe") || city === "Himeji" || city === "Nishinomiya") {
        prefecture = "Hyogo";
      } else if (city.includes("Nara")) {
        prefecture = "Nara";
      } else if (city.includes("Wakayama") || city === "Tanabe" || city === "Shirahama") {
        prefecture = "Wakayama";
      } else if (city === "Otsu" || city === "Hikone" || city === "Nagahama") {
        prefecture = "Shiga";
      } else if (
        city === "Tsu" ||
        city === "Ise" ||
        city === "Yokkaichi" ||
        city === "Suzuka"
      ) {
        prefecture = "Mie";
      }
    }

    return { prefecture, city };
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
      text.includes("mt.") ||
      text.includes("lake") ||
      text.includes("river") ||
      text.includes("waterfall") ||
      text.includes("park") ||
      text.includes("nature") ||
      text.includes("garden") ||
      text.includes("gorge") ||
      text.includes("valley") ||
      text.includes("beach") ||
      text.includes("coast") ||
      text.includes("island") ||
      text.includes("hiking") ||
      text.includes("trail")
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
      text.includes("cultural") ||
      text.includes("zen") ||
      text.includes("buddhist") ||
      text.includes("shinto") ||
      text.includes("pagoda") ||
      text.includes("palace") ||
      text.includes("art") ||
      text.includes("gallery")
    ) {
      return "culture";
    }

    // Food indicators
    if (
      text.includes("restaurant") ||
      text.includes("food") ||
      text.includes("cuisine") ||
      text.includes("market") ||
      text.includes("dining") ||
      text.includes("cafe") ||
      text.includes("ramen") ||
      text.includes("sushi") ||
      text.includes("izakaya")
    ) {
      return "food";
    }

    // Shopping indicators
    if (
      text.includes("shopping") ||
      text.includes("shop") ||
      text.includes("mall") ||
      text.includes("arcade") ||
      text.includes("store") ||
      text.includes("boutique")
    ) {
      return "shopping";
    }

    // Hotel indicators
    if (
      text.includes("hotel") ||
      text.includes("resort") ||
      text.includes("accommodation") ||
      text.includes("inn") ||
      text.includes("ryokan") ||
      text.includes("lodging")
    ) {
      return "hotel";
    }

    // Attraction indicators (aquarium, zoo, theme park, etc.)
    if (
      text.includes("aquarium") ||
      text.includes("zoo") ||
      text.includes("theme park") ||
      text.includes("entertainment") ||
      text.includes("observation") ||
      text.includes("tower") ||
      text.includes("observatory")
    ) {
      return "attraction";
    }

    // Default to attraction
    return "attraction";
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new KansaiScraper();
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

export default KansaiScraper;
