#!/usr/bin/env npx tsx
/**
 * Script to fix locations that have addresses instead of real descriptions
 *
 * Strategy:
 * 1. If editorial_summary exists, use it as the description
 * 2. Otherwise, generate a basic description based on name/category/city
 */

import { getSupabase, fetchAllLocations } from './lib/db';
import { colors } from './lib/cli';

const DRY_RUN = process.argv.includes('--dry-run');

// Category-specific description templates
const CATEGORY_TEMPLATES: Record<string, (name: string, city: string) => string> = {
  temple: (name, city) =>
    `${name} is a Buddhist temple in ${city}, offering visitors a peaceful atmosphere and traditional Japanese architecture.`,
  shrine: (name, city) =>
    `${name} is a Shinto shrine in ${city}, featuring traditional torii gates and sacred grounds for worship and reflection.`,
  nature: (name, city) =>
    `${name} is a natural attraction in ${city}, offering scenic beauty and opportunities to enjoy Japan's diverse landscapes.`,
  park: (name, city) =>
    `${name} is a public park in ${city}, providing green spaces for relaxation, recreation, and seasonal natural beauty.`,
  landmark: (name, city) =>
    `${name} is a notable landmark in ${city}, representing an important cultural or historical site worth visiting.`,
  museum: (name, city) =>
    `${name} is a museum in ${city}, showcasing exhibits that explore art, history, culture, or science.`,
  food: (name, city) =>
    `${name} is a dining establishment in ${city}, offering local cuisine and culinary experiences.`,
  restaurant: (name, city) =>
    `${name} is a restaurant in ${city}, serving delicious food in a welcoming atmosphere.`,
  shopping: (name, city) =>
    `${name} is a shopping destination in ${city}, offering a variety of goods from local crafts to modern items.`,
  culture: (name, city) =>
    `${name} is a cultural attraction in ${city}, providing insight into Japanese traditions and heritage.`,
  attraction: (name, city) =>
    `${name} is a popular attraction in ${city}, offering entertainment and memorable experiences for visitors.`,
  entertainment: (name, city) =>
    `${name} is an entertainment venue in ${city}, providing fun activities and experiences for all ages.`,
  wellness: (name, city) =>
    `${name} is a wellness facility in ${city}, offering relaxation and rejuvenation through traditional or modern treatments.`,
  viewpoint: (name, city) =>
    `${name} is a scenic viewpoint in ${city}, offering panoramic views of the surrounding landscape.`,
  beach: (name, city) =>
    `${name} is a beach in ${city}, perfect for swimming, sunbathing, and enjoying the coastal scenery.`,
};

function isAddressDescription(desc: string | null | undefined): boolean {
  if (!desc) return false;
  const d = desc.trim();
  // Matches Japanese address patterns or postal codes
  if (/^\d{3}-\d{4}/.test(d)) return true; // Starts with postal code
  if (/^[A-Z]?-?\d+/.test(d) && d.includes('District')) return true; // Address format
  if (d.length < 100 && /\d{3}-\d{4}/.test(d)) return true; // Short with postal code
  // Additional patterns
  if (d.includes(', Japan') && d.length < 150) return true;
  if (/^\d+-\d+/.test(d) && d.includes(',')) return true; // Starts with address number
  return false;
}

function generateDescription(name: string, category: string, city: string): string {
  const template = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES['attraction'];
  return template(name, city);
}

async function main() {
  console.log(colors.bold(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fixing address-as-description issues...\n`));

  const supabase = getSupabase();
  const locations = await fetchAllLocations();

  // Find locations with addresses as descriptions
  const addressDescriptions = locations.filter(loc => isAddressDescription(loc.description));

  console.log(`Found ${addressDescriptions.length} locations with addresses as descriptions\n`);

  let usedEditorial = 0;
  let generated = 0;
  let errors = 0;

  for (const loc of addressDescriptions) {
    let newDescription: string;
    let source: string;

    if (loc.editorial_summary && loc.editorial_summary.length > 20) {
      // Use editorial summary
      newDescription = loc.editorial_summary;
      source = 'editorial_summary';
      usedEditorial++;
    } else {
      // Generate based on category
      newDescription = generateDescription(loc.name, loc.category, loc.city);
      source = 'generated';
      generated++;
    }

    if (DRY_RUN) {
      console.log(colors.gray(`  [${source}] ${loc.name}`));
      console.log(colors.gray(`    Old: ${loc.description?.substring(0, 60)}...`));
      console.log(colors.gray(`    New: ${newDescription.substring(0, 60)}...`));
    } else {
      const { error } = await supabase
        .from('locations')
        .update({ description: newDescription })
        .eq('id', loc.id);

      if (error) {
        console.log(colors.red(`  ✗ Failed: ${loc.name} - ${error.message}`));
        errors++;
      } else {
        console.log(colors.green(`  ✓ [${source}] ${loc.name}`));
      }
    }
  }

  // Summary
  console.log(colors.bold('\n========================================'));
  console.log(colors.bold('SUMMARY'));
  console.log(colors.bold('========================================\n'));
  console.log(`  Total fixed: ${usedEditorial + generated}`);
  console.log(`  ${colors.green(`✓ ${usedEditorial} used editorial_summary`)}`);
  console.log(`  ${colors.blue(`✓ ${generated} generated from template`)}`);
  if (errors > 0) {
    console.log(`  ${colors.red(`✗ ${errors} errors`)}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log(colors.yellow('This was a dry run. Use without --dry-run to apply changes.\n'));
  }
}

main().catch(console.error);
