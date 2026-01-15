#!/usr/bin/env tsx
/**
 * Okinawa Tourism Website Scraper
 *
 * Source: https://visitokinawajapan.com/
 * Expected: 100-150 locations
 * Region: Okinawa
 *
 * This scraper extracts location data from the official Okinawa tourism website
 * for INTERNAL TESTING purposes only.
 *
 * Strategy:
 * - Scrape beaches from 3 beach pages (18 + 22 + estimated 20 = ~60 beaches)
 * - Scrape World Heritage sites (9 cultural sites)
 * - Scrape islands from 5 island groups (Kerama, Miyako, Yaeyama, Kume, Main Island)
 * - Total estimated: 100-150 locations
 */

import { BaseScraper, ScrapedLocation } from "./base-scraper";

export class OkinawaScraper extends BaseScraper {
  constructor() {
    super({
      name: "okinawa_tourism",
      baseUrl: "https://visitokinawajapan.com/",
      region: "Okinawa",
      rateLimit: 2000, // 2 seconds between requests to be respectful
    });
  }

  async scrape(): Promise<ScrapedLocation[]> {
    try {
      // 1. Scrape beaches from 3 regional beach pages
      await this.scrapeBeaches();

      // 2. Scrape World Heritage sites
      await this.scrapeWorldHeritage();

      // 3. Scrape island destinations
      await this.scrapeIslands();

      // 4. Scrape attractions from main island regions
      await this.scrapeMainIslandRegions();

      // 5. Scrape dive sites
      await this.scrapeDiveSites();

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
   * Scrape beaches from the 3 regional beach pages
   */
  private async scrapeBeaches(): Promise<void> {
    const beachPages = [
      {
        url: `${this.config.baseUrl}discover/beach-information/beaches-northern-okinawa/`,
        region: "Northern Okinawa",
      },
      {
        url: `${this.config.baseUrl}discover/beach-information/beaches-central-southern-okinawa/`,
        region: "Central & Southern Okinawa",
      },
      {
        url: `${this.config.baseUrl}discover/beach-information/beaches-kume-miyako-yaeyama/`,
        region: "Kume, Miyako & Yaeyama Islands",
      },
    ];

    for (const page of beachPages) {
      await this.delay();
      try {
        this.log(`Scraping beaches from ${page.region}...`);
        const $ = await this.fetchHtml(page.url);

        // Beach sections are organized with anchor IDs like #con-01, #con-02, etc.
        // Look for sections containing beach information
        const beachSections = $('section[id^="con-"], div[id^="con-"]');

        if (beachSections.length === 0) {
          // Fallback: look for any content that might contain beach names
          this.logWarning(`No beach sections found on ${page.url}, trying alternative selectors`);
          await this.scrapeBeachesAlternative($, page.url, page.region);
          continue;
        }

        beachSections.each((index, element) => {
          try {
            const $section = $(element);

            // Extract beach name from heading
            let name = this.cleanText($section.find("h2, h3, h4").first().text());

            if (!name) {
              // Try to find name in strong tags or other elements
              name = this.cleanText($section.find("strong").first().text());
            }

            if (!name) {
              this.logWarning(`No name found for beach section ${index} on ${page.url}`);
              return;
            }

            // Extract city/location from address or text
            let city = "";
            const addressText = this.cleanText($section.find("p:contains('Address'), .address").text());

            // Try to extract city from address
            if (addressText) {
              // Common patterns: "City Name, Prefecture" or just "City Name"
              const cityMatch = addressText.match(/([^,]+?)\s+(City|Village|Town|Island)/i);
              if (cityMatch) {
                city = cityMatch[1].trim() + " " + cityMatch[2];
              }
            }

            // Extract website/source URL
            let sourceUrl = page.url;
            const websiteLink = $section.find('a:contains("WEBSITE"), a[href*="http"]').first();
            if (websiteLink.length > 0) {
              const href = websiteLink.attr("href");
              if (href && href.startsWith("http")) {
                sourceUrl = href;
              }
            }

            // Extract description
            let description = this.cleanText($section.find("p").first().text());

            // Limit description length
            if (description.length > 500) {
              description = description.substring(0, 497) + "...";
            }

            // Add location
            this.addLocation({
              name: name,
              category: "nature", // Beaches are nature
              region: this.config.region,
              prefecture: "Okinawa",
              city: city || undefined,
              sourceUrl: sourceUrl,
              description: description || `Beach in ${page.region}`,
            });

            this.stats.successfulScrapes++;
          } catch (error) {
            this.logError(`Failed to parse beach ${index} on ${page.url}`, error);
            this.stats.failedScrapes++;
          }
        });
      } catch (error) {
        this.logError(`Failed to scrape beach page ${page.url}`, error);
        this.stats.failedScrapes++;
      }
    }
  }

  /**
   * Alternative method to scrape beaches if primary method fails
   */
  private async scrapeBeachesAlternative(
    $: cheerio.CheerioAPI,
    pageUrl: string,
    regionName: string,
  ): Promise<void> {
    // Look for any text patterns that might indicate beach names
    // Common patterns: "Beach Name Beach", "Beach Name", etc.
    const textContent = $.text();
    const beachPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Beach/g;
    const matches = textContent.matchAll(beachPattern);

    for (const match of matches) {
      try {
        const beachName = match[1].trim() + " Beach";

        // Avoid duplicates
        if (this.locations.some(loc => loc.name === beachName)) {
          continue;
        }

        this.addLocation({
          name: beachName,
          category: "nature",
          region: this.config.region,
          prefecture: "Okinawa",
          sourceUrl: pageUrl,
          description: `Beach in ${regionName}`,
        });

        this.stats.successfulScrapes++;
      } catch (error) {
        this.logError(`Failed to parse beach from alternative method`, error);
        this.stats.failedScrapes++;
      }
    }
  }

  /**
   * Scrape World Heritage sites
   */
  private async scrapeWorldHeritage(): Promise<void> {
    await this.delay();

    try {
      this.log("Scraping World Heritage sites...");
      const heritageUrl = `${this.config.baseUrl}discover/world-heritage-top/`;
      const $ = await this.fetchHtml(heritageUrl);

      // Look for links to individual heritage sites
      // These are typically in anchor tags with href containing "/discover/world-heritage-top/"
      const heritageLinks = $('a[href*="/discover/world-heritage-top/"]').filter((_, el) => {
        const href = $(el).attr("href") || "";
        // Filter out the main page itself and navigation links
        return href !== "/discover/world-heritage-top/" &&
               href.includes("/discover/world-heritage-top/") &&
               !href.includes("#");
      });

      const uniqueUrls = new Set<string>();

      heritageLinks.each((index, element) => {
        try {
          const $element = $(element);
          const href = $element.attr("href") || "";

          // Build full URL
          const fullUrl = href.startsWith("http")
            ? href
            : `${this.config.baseUrl}${href.replace(/^\//, "")}`;

          // Skip social media and language links
          if (fullUrl.includes("facebook.com") || fullUrl.includes("twitter.com") ||
              fullUrl.includes("instagram.com") || fullUrl.includes("/zh-") ||
              fullUrl.includes("/ja/") || fullUrl.includes("/ko/")) {
            return;
          }

          // Skip if already processed
          if (uniqueUrls.has(fullUrl)) {
            return;
          }
          uniqueUrls.add(fullUrl);

          // Extract name from heading first (more accurate), then link text, then image alt
          let name = this.cleanText($element.find("h2, h3, h4").first().text());
          if (!name) {
            name = this.cleanText($element.find("img").attr("alt") || "");
          }
          if (!name) {
            // Get only the direct text, not all nested text
            name = this.cleanText($element.clone().children().remove().end().text());
          }

          if (!name) {
            this.logWarning(`No name found for heritage site ${index}`);
            return;
          }

          // Clean up name by removing common navigation text
          name = name.replace(/\s*(READ MORE|read more|Learn more|LEARN MORE)\s*$/i, "").trim();

          // Skip social media names and invalid entries
          if (!name || name.toLowerCase().includes("facebook") || name.toLowerCase().includes("twitter") ||
              name.toLowerCase().includes("instagram") || name.includes("繁體中文") ||
              name.includes("简体中文") || name.includes("한국어") || name.length < 3) {
            return;
          }

          // Determine if it's a castle/cultural site or natural heritage
          const isNaturalHeritage = name.toLowerCase().includes("national park") ||
                                    name.toLowerCase().includes("forest") ||
                                    name.toLowerCase().includes("nature");

          // Add location
          this.addLocation({
            name: name,
            category: isNaturalHeritage ? "nature" : "culture",
            region: this.config.region,
            prefecture: "Okinawa",
            sourceUrl: fullUrl,
            description: isNaturalHeritage
              ? "UNESCO Natural World Heritage Site"
              : "UNESCO Cultural World Heritage Site",
          });

          this.stats.successfulScrapes++;
        } catch (error) {
          this.logError(`Failed to parse heritage site ${index}`, error);
          this.stats.failedScrapes++;
        }
      });

      this.log(`Found ${uniqueUrls.size} unique World Heritage sites`);
    } catch (error) {
      this.logError("Failed to scrape World Heritage sites", error);
      this.stats.failedScrapes++;
    }
  }

  /**
   * Scrape island destinations from the 5 main island groups
   */
  private async scrapeIslands(): Promise<void> {
    const islandPages = [
      {
        url: `${this.config.baseUrl}destinations/kerama-islands/`,
        name: "Kerama Islands",
      },
      {
        url: `${this.config.baseUrl}destinations/miyako-islands/`,
        name: "Miyako Islands",
      },
      {
        url: `${this.config.baseUrl}destinations/yaeyama-islands/`,
        name: "Yaeyama Islands",
      },
      {
        url: `${this.config.baseUrl}destinations/kume-island/`,
        name: "Kume Island",
      },
    ];

    for (const page of islandPages) {
      await this.delay();

      try {
        this.log(`Scraping islands from ${page.name}...`);
        const $ = await this.fetchHtml(page.url);

        // Look for links to specific islands
        // Pattern: /destinations/[parent-island]/[specific-island]/
        const islandLinks = $(`a[href*="/destinations/"]`).filter((_, el) => {
          const href = $(el).attr("href") || "";
          // Should be a child page of the current island group
          return href.includes(page.url.split("/destinations/")[1]) &&
                 href !== page.url &&
                 !href.includes("#");
        });

        const uniqueUrls = new Set<string>();

        islandLinks.each((index, element) => {
          try {
            const $element = $(element);
            const href = $element.attr("href") || "";

            // Build full URL
            const fullUrl = href.startsWith("http")
              ? href
              : `${this.config.baseUrl}${href.replace(/^\//, "")}`;

            // Skip social media and language links
            if (fullUrl.includes("facebook.com") || fullUrl.includes("twitter.com") ||
                fullUrl.includes("instagram.com") || fullUrl.includes("/zh-") ||
                fullUrl.includes("/ja/") || fullUrl.includes("/ko/")) {
              return;
            }

            // Skip if already processed
            if (uniqueUrls.has(fullUrl)) {
              return;
            }
            uniqueUrls.add(fullUrl);

            // Extract island name - prioritize heading, then image alt, then direct text
            let name = this.cleanText($element.find("h2, h3, h4").first().text());
            if (!name) {
              name = this.cleanText($element.find("img").attr("alt") || "");
            }
            if (!name) {
              name = this.cleanText($element.clone().children().remove().end().text());
            }

            if (!name) {
              this.logWarning(`No name found for island ${index} on ${page.name}`);
              return;
            }

            // Clean up name by removing common navigation text
            name = name.replace(/\s*(READ MORE|read more|Learn more|LEARN MORE)\s*$/i, "").trim();

            // Skip social media names and invalid entries
            if (!name || name.toLowerCase().includes("facebook") || name.toLowerCase().includes("twitter") ||
                name.toLowerCase().includes("instagram") || name.includes("繁體中文") ||
                name.includes("简体中文") || name.includes("한국어") || name.length < 3) {
              return;
            }

            // Extract description
            let description = this.cleanText($element.find("p").text());
            if (!description) {
              description = this.cleanText($element.closest("div, article").find("p").first().text());
            }

            // Limit description length
            if (description.length > 500) {
              description = description.substring(0, 497) + "...";
            }

            // Add location
            this.addLocation({
              name: name,
              category: "attraction",
              region: this.config.region,
              prefecture: "Okinawa",
              sourceUrl: fullUrl,
              description: description || `Island in ${page.name}`,
            });

            this.stats.successfulScrapes++;
          } catch (error) {
            this.logError(`Failed to parse island ${index} on ${page.name}`, error);
            this.stats.failedScrapes++;
          }
        });

        this.log(`Found ${uniqueUrls.size} islands in ${page.name}`);

        // Also scrape specific attractions mentioned on the island group page
        await this.scrapeIslandAttractions($, page.url, page.name);

      } catch (error) {
        this.logError(`Failed to scrape island page ${page.url}`, error);
        this.stats.failedScrapes++;
      }
    }
  }

  /**
   * Scrape specific attractions mentioned on island pages (castles, beaches, etc.)
   */
  private async scrapeIslandAttractions(
    $: cheerio.CheerioAPI,
    pageUrl: string,
    regionName: string,
  ): Promise<void> {
    // Look for mentions of specific attractions like castles, beaches, temples
    const textContent = $.text();

    // Pattern for castle sites
    const castlePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Castle|Castle Ruins|Castle Site)/gi;
    const castleMatches = textContent.matchAll(castlePattern);

    for (const match of castleMatches) {
      try {
        const name = match[1].trim() + " " + match[2];

        // Avoid duplicates
        if (this.locations.some(loc => loc.name === name)) {
          continue;
        }

        this.addLocation({
          name: name,
          category: "culture",
          region: this.config.region,
          prefecture: "Okinawa",
          sourceUrl: pageUrl,
          description: `Historic site in ${regionName}`,
        });

        this.stats.successfulScrapes++;
      } catch (error) {
        this.logError(`Failed to parse castle from text`, error);
        this.stats.failedScrapes++;
      }
    }
  }

  /**
   * Scrape dive sites from the dive section
   */
  private async scrapeDiveSites(): Promise<void> {
    const diveSitePages = [
      {
        url: `${this.config.baseUrl}discover/dive-sites-okinawa/okinawa-main-island-diving/`,
        name: "Okinawa Main Island",
      },
      {
        url: `${this.config.baseUrl}discover/dive-sites-okinawa/kerama-islands-diving/`,
        name: "Kerama Islands",
      },
      {
        url: `${this.config.baseUrl}discover/dive-sites-okinawa/kume-island-diving/`,
        name: "Kume Island",
      },
      {
        url: `${this.config.baseUrl}discover/dive-sites-okinawa/miyako-islands-diving/`,
        name: "Miyako Islands",
      },
      {
        url: `${this.config.baseUrl}discover/dive-sites-okinawa/yaeyama-islands-diving/`,
        name: "Yaeyama Islands",
      },
      {
        url: `${this.config.baseUrl}discover/dive-sites-okinawa/yonaguni-island-diving/`,
        name: "Yonaguni Island",
      },
    ];

    for (const page of diveSitePages) {
      await this.delay();

      try {
        this.log(`Scraping dive sites from ${page.name}...`);
        const $ = await this.fetchHtml(page.url);

        // Look for dive site names in headings or text
        // Dive sites are typically listed with bold names or in headings
        const textContent = $.text();

        // Look for patterns like "Site Name" (parenthetical location)
        // or headings with dive site names
        $("h2, h3, h4, strong").each((index, element) => {
          try {
            const $element = $(element);
            let name = this.cleanText($element.text());

            // Skip if it's not a dive site name (too long, or navigation text)
            if (!name || name.length > 50 || name.toLowerCase().includes("diving") ||
                name.toLowerCase().includes("explore") || name.toLowerCase().includes("read more")) {
              return;
            }

            // Check if this looks like a dive site name
            const isDiveSite = name.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/) ||
                              name.includes("Cave") || name.includes("Reef") ||
                              name.includes("Wall") || name.includes("Point");

            if (!isDiveSite) {
              return;
            }

            // Avoid duplicates
            if (this.locations.some(loc => loc.name === name)) {
              return;
            }

            this.addLocation({
              name: name,
              category: "nature",
              region: this.config.region,
              prefecture: "Okinawa",
              sourceUrl: page.url,
              description: `Dive site in ${page.name}`,
            });

            this.stats.successfulScrapes++;
          } catch (error) {
            this.logError(`Failed to parse dive site ${index} on ${page.name}`, error);
            this.stats.failedScrapes++;
          }
        });
      } catch (error) {
        this.logError(`Failed to scrape dive site page ${page.url}`, error);
        this.stats.failedScrapes++;
      }
    }
  }

  /**
   * Scrape attractions from main island regional pages
   */
  private async scrapeMainIslandRegions(): Promise<void> {
    const regionalPages = [
      {
        url: `${this.config.baseUrl}destinations/okinawa-main-island/northern-okinawa-main-island/`,
        name: "Northern Okinawa",
      },
      {
        url: `${this.config.baseUrl}destinations/okinawa-main-island/central-okinawa-main-island/`,
        name: "Central Okinawa",
      },
      {
        url: `${this.config.baseUrl}destinations/okinawa-main-island/southern-okinawa-main-island/`,
        name: "Southern Okinawa",
      },
    ];

    for (const page of regionalPages) {
      await this.delay();

      try {
        this.log(`Scraping ${page.name}...`);
        const $ = await this.fetchHtml(page.url);

        // Look for links to specific destinations within this region
        const destLinks = $(`a[href*="/destinations/okinawa-main-island/"]`).filter((_, el) => {
          const href = $(el).attr("href") || "";
          // Should be a child page of the current region
          const regionSlug = page.url.split("/destinations/okinawa-main-island/")[1];
          return href.includes(regionSlug) &&
                 href !== page.url &&
                 !href.includes("#");
        });

        const uniqueUrls = new Set<string>();

        destLinks.each((index, element) => {
          try {
            const $element = $(element);
            const href = $element.attr("href") || "";

            // Build full URL
            const fullUrl = href.startsWith("http")
              ? href
              : `${this.config.baseUrl}${href.replace(/^\//, "")}`;

            // Skip social media and language links
            if (fullUrl.includes("facebook.com") || fullUrl.includes("twitter.com") ||
                fullUrl.includes("instagram.com") || fullUrl.includes("/zh-") ||
                fullUrl.includes("/ja/") || fullUrl.includes("/ko/")) {
              return;
            }

            // Skip if already processed
            if (uniqueUrls.has(fullUrl)) {
              return;
            }
            uniqueUrls.add(fullUrl);

            // Extract name - prioritize heading, then image alt, then direct text
            let name = this.cleanText($element.find("h2, h3, h4").first().text());
            if (!name) {
              name = this.cleanText($element.find("img").attr("alt") || "");
            }
            if (!name) {
              name = this.cleanText($element.clone().children().remove().end().text());
            }

            if (!name) {
              return;
            }

            // Clean up name by removing common navigation text
            name = name.replace(/\s*(READ MORE|read more|Learn more|LEARN MORE)\s*$/i, "").trim();

            // Skip social media names and invalid entries
            if (!name || name.toLowerCase().includes("facebook") || name.toLowerCase().includes("twitter") ||
                name.toLowerCase().includes("instagram") || name.includes("繁體中文") ||
                name.includes("简体中文") || name.includes("한국어") || name.length < 3) {
              return;
            }

            // Extract description
            let description = this.cleanText($element.find("p").text());
            if (!description) {
              description = this.cleanText($element.closest("div, article").find("p").first().text());
            }

            // Limit description length
            if (description.length > 500) {
              description = description.substring(0, 497) + "...";
            }

            // Determine category based on name
            let category = "attraction";
            const nameLower = name.toLowerCase();

            if (nameLower.includes("castle") || nameLower.includes("temple") ||
                nameLower.includes("shrine") || nameLower.includes("museum")) {
              category = "culture";
            } else if (nameLower.includes("park") || nameLower.includes("garden") ||
                       nameLower.includes("forest") || nameLower.includes("island")) {
              category = "nature";
            }

            // Add location
            this.addLocation({
              name: name,
              category: category,
              region: this.config.region,
              prefecture: "Okinawa",
              sourceUrl: fullUrl,
              description: description || `Attraction in ${page.name}`,
            });

            this.stats.successfulScrapes++;
          } catch (error) {
            this.logError(`Failed to parse destination ${index} on ${page.name}`, error);
            this.stats.failedScrapes++;
          }
        });

        this.log(`Found ${uniqueUrls.size} destinations in ${page.name}`);
      } catch (error) {
        this.logError(`Failed to scrape regional page ${page.url}`, error);
        this.stats.failedScrapes++;
      }
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const scraper = new OkinawaScraper();
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

export default OkinawaScraper;
