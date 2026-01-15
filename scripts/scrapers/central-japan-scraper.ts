#!/usr/bin/env tsx
/**
 * Central Japan (Chubu) Tourism Scraper
 *
 * Source: https://shoryudo.go-centraljapan.jp/en/
 * Expected: 200-300 locations
 * Region: Chubu
 *
 * This scraper extracts location data from the Shoryudo Central Japan tourism website
 * for INTERNAL TESTING purposes only.
 *
 * Structure:
 * - 9 prefectures: Aichi, Gifu, Nagano, Shizuoka, Ishikawa, Toyama, Fukui, Shiga, Mie
 * - Each prefecture has a page with attractions organized by category
 * - Categories: Landscape, Activity, Entertainment, Life & Culture, Eating
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";

export class CentralJapanScraper extends BaseScraper {
  // The 9 Chubu/Hokuriku prefectures covered by this site
  private prefectures = [
    { name: "Aichi", slug: "aichi" },
    { name: "Gifu", slug: "gifu" },
    { name: "Nagano", slug: "nagano" },
    { name: "Shizuoka", slug: "shizuoka" },
    { name: "Ishikawa", slug: "ishikawa" },
    { name: "Toyama", slug: "toyama" },
    { name: "Fukui", slug: "fukui" },
    { name: "Shiga", slug: "shiga" },
    { name: "Mie", slug: "mie" },
  ];

  constructor() {
    super({
      name: "central_japan_dmo",
      baseUrl: "https://shoryudo.go-centraljapan.jp/en/",
      region: "Chubu",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      this.log(`Starting scrape of ${this.prefectures.length} prefectures...`);

      // Scrape each prefecture
      for (const prefecture of this.prefectures) {
        await this.delay();

        const prefectureUrl = `${this.config.baseUrl}special-prefecture/${prefecture.slug}/`;

        try {
          this.log(`Scraping ${prefecture.name} prefecture...`);
          const $ = await this.fetchHtml(prefectureUrl);
          await this.scrapePrefecture($, prefecture.name, prefectureUrl);
        } catch (error) {
          this.logError(`Failed to scrape ${prefecture.name} prefecture`, error);
          this.stats.failedScrapes++;
        }
      }

      this.logSuccess(
        `Scraped ${this.stats.successfulScrapes} locations from ${this.prefectures.length} prefectures`,
      );
      return this.locations;
    } catch (error) {
      this.logError("Fatal error during scraping", error);
      throw error;
    }
  }

  /**
   * Scrape a single prefecture page
   */
  private async scrapePrefecture(
    $: cheerio.CheerioAPI,
    prefecture: string,
    prefectureUrl: string,
  ): Promise<void> {
    // Find all attraction links on the page
    // Attractions are in <a> tags with <h4> containing the name
    // Structure: <a href="[attraction-url]"><img src="..."><h4>[name]</h4></a>

    const attractionLinks = $('a[href*="go-centraljapan.jp/en/"]').filter((_, element) => {
      const $el = $(element);
      // Must have an h4 tag (attraction name) and be a detail page link
      const hasName = $el.find('h4').length > 0;
      const href = $el.attr('href') || '';
      // Detail pages don't contain "special-prefecture", "courses", etc.
      const isDetailPage = !href.includes('/special-prefecture/') &&
                          !href.includes('/courses/') &&
                          !href.includes('/short-trip/') &&
                          href !== this.config.baseUrl &&
                          href.includes('go-centraljapan.jp/en/');
      return hasName && isDetailPage;
    });

    if (attractionLinks.length === 0) {
      this.logWarning(`No attractions found for ${prefecture}`);
      return;
    }

    this.log(`Found ${attractionLinks.length} attractions in ${prefecture}`);

    attractionLinks.each((index, element) => {
      try {
        const $element = $(element);

        // Extract name from h4 tag
        const name = this.cleanText($element.find('h4').text());
        if (!name) {
          this.logWarning(`No name found for attraction ${index} in ${prefecture}`);
          return;
        }

        // Extract detail URL
        const href = $element.attr('href') || '';
        if (!href) {
          this.logWarning(`No URL found for ${name}`);
          return;
        }

        // Build full URL
        const detailUrl = href.startsWith('http')
          ? href
          : `https://shoryudo.go-centraljapan.jp${href.startsWith('/') ? '' : '/'}${href}`;

        // Try to determine category from the section heading above this attraction
        let category = "attraction"; // default

        // Find the parent list item or container
        const $container = $element.closest('li, .item, .card');

        // Look for the nearest h3 heading that comes before this element in the document
        // We need to search through all h3s and find the last one that appears before this element
        let categoryText = '';
        const allH3s = $('h3');
        const elementIndex = $('a').index($element);

        for (let i = allH3s.length - 1; i >= 0; i--) {
          const $h3 = allH3s.eq(i);
          const h3Index = $('*').index($h3);
          const thisIndex = $('*').index($element);

          if (h3Index < thisIndex) {
            categoryText = this.cleanText($h3.text()).toLowerCase();
            break;
          }
        }

        // Map the site's categories to our standard categories
        if (categoryText.includes('landscape')) {
          category = 'nature';
        } else if (categoryText.includes('activity')) {
          category = 'attraction';
        } else if (categoryText.includes('entertainment')) {
          category = 'attraction';
        } else if (categoryText.includes('life') || categoryText.includes('culture')) {
          category = 'culture';
        } else if (categoryText.includes('eating') || categoryText.includes('food')) {
          category = 'food';
        }

        // Extract image for potential description purposes
        const imageAlt = this.cleanText($element.find('img').attr('alt') || '');

        // Try to extract description from nearby text (if available on listing page)
        const description = this.cleanText($element.find('p, .description').first().text());

        // Add location
        this.addLocation({
          name: this.cleanText(name),
          category,
          region: this.config.region,
          prefecture,
          city: undefined, // Not available on prefecture pages, would need detail page
          sourceUrl: detailUrl,
          description: description || undefined,
        });

        this.stats.successfulScrapes++;
      } catch (error) {
        this.logError(`Failed to parse attraction ${index} in ${prefecture}`, error);
        this.stats.failedScrapes++;
      }
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new CentralJapanScraper();
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

export default CentralJapanScraper;
