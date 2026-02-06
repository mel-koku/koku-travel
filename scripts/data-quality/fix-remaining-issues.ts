#!/usr/bin/env npx tsx
/**
 * Script to fix all remaining data quality issues
 */

import { getSupabase, getLocationById } from './lib/db';
import { colors } from './lib/cli';

const DRY_RUN = process.argv.includes('--dry-run');

// Name fixes
const NAME_FIXES: Record<string, string> = {
  // Long name - shorten it
  'ishikawa-prefectural-institute-for-yamanaka-lacquer-ware-ishikawa-prefectural-training-institute-of-woodturning-chubu-e36827b0': 'Yamanaka Lacquerware Institute',
  // Japanese-only name that should have English
  'gehoku-tohoku-c2d9c740': 'Akiota Regional Commerce',
};

// Description fixes - locations with addresses or duplicate descriptions
const DESCRIPTION_FIXES: Record<string, string> = {
  // Asutamuland - has address as description
  'asutamuland-tokushima-shikoku-bb5e0d92':
    'Asutamuland is a large science and nature theme park in Tokushima featuring interactive exhibits, planetarium shows, and outdoor adventure areas perfect for families with children.',

  // Tokushima Toy Museum - has address as description (same address as Asutamuland, they share a location)
  'tokushima-toy-museum-shikoku-1a24a701':
    'The Tokushima Toy Museum showcases traditional Japanese toys and games, featuring hands-on exhibits where visitors can play with wooden toys, learn about toy-making crafts, and discover the history of Japanese playthings.',

  // Bihoku Hillside Park - shared generic description
  'bihoku-hillside-park-chugoku-7242918c':
    'Bihoku Hillside Park is a sprawling national park featuring beautiful flower gardens that bloom throughout the seasons, large open lawns, and family-friendly recreational facilities including cycling paths and playgrounds.',

  // Akiota Regional Commerce - has description about gorges
  'gehoku-tohoku-c2d9c740':
    'Akiota Regional Commerce promotes local products and crafts from the Akiota area in Hiroshima Prefecture, offering visitors a chance to discover traditional goods and local specialties.',

  // Fushimi Castle - shared description with Hachimanyama
  'fushimi-castle-kansai-9826a25f':
    'Fushimi Castle is a reconstruction of Toyotomi Hideyoshi\'s famous castle, originally built in 1592. The current concrete structure houses a museum about the castle\'s history and the era of Hideyoshi.',

  // Hachimanyama Castle Ruins - shared description
  'hachimanyama-castle-kansai-235b4815':
    'Hachimanyama Castle Ruins sit atop Mount Hachiman in Omihachiman, offering panoramic views of Lake Biwa. The hilltop fortress was built by Toyotomi Hidetsugu in 1585 and features a scenic ropeway to the summit.',

  // Hakuba Iwatake Mountainbike PARK - shared description
  'hakuba-iwatake-mountainbike-park-chubu-e2b63d93':
    'Hakuba Iwatake Mountainbike Park offers thrilling downhill courses for all skill levels, with stunning views of the Northern Japan Alps. In summer, riders can take the gondola up and enjoy multiple trails down.',

  // Happo Pond - shared description
  'happo-pond-chubu-dfbae03e':
    'Happo Pond is a pristine alpine lake at 2,060 meters elevation, accessible via the Happo-One ski resort gondolas. The crystal-clear waters reflect the dramatic peaks of the Northern Alps, making it a popular hiking destination.',

  // Ichigoya Sky Farm - shared description
  'ichigoya-sky-farm-shikoku-cfa046b1':
    'Ichigoya Sky Farm offers strawberry picking experiences in Takamatsu, allowing visitors to harvest and taste fresh, ripe strawberries grown using advanced hydroponic techniques in a clean greenhouse environment.',

  // Nakano Udon School - shared description
  'nakano-udon-school-takamatsu-campus-udon-noodle-making-experience-shikoku-bd133f23':
    'Nakano Udon School provides hands-on udon noodle making classes where participants learn to knead, roll, and cut their own Sanuki udon, then enjoy eating their fresh handmade noodles.',

  // Sanuki Mengyo - shared description
  'sanuki-mengyo-udon-noodle-making-experience-shikoku-c47fe220':
    'Sanuki Mengyo is a traditional udon noodle factory offering authentic noodle-making experiences. Visitors can learn the centuries-old techniques of crafting Kagawa\'s famous Sanuki udon.',

  // Long-named institute has address as description
  'ishikawa-prefectural-institute-for-yamanaka-lacquer-ware-ishikawa-prefectural-training-institute-of-woodturning-chubu-e36827b0':
    'The Yamanaka Lacquerware Institute preserves and teaches the traditional craft of Yamanaka lacquerware, one of Japan\'s most renowned lacquer traditions. Visitors can observe artisans at work and learn about the 400-year history of this craft.',
};

async function main() {
  console.log(colors.bold(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fixing remaining data quality issues...\n`));

  const supabase = getSupabase();
  let nameFixed = 0;
  let descFixed = 0;
  let errors = 0;

  // 1. Fix names
  console.log(colors.bold('\n--- Fixing names ---\n'));
  for (const [id, newName] of Object.entries(NAME_FIXES)) {
    const loc = await getLocationById(id);
    if (!loc) {
      console.log(colors.yellow(`  ⊘ ${id} - not found`));
      continue;
    }

    if (DRY_RUN) {
      console.log(colors.gray(`  Would fix: "${loc.name}" → "${newName}"`));
      nameFixed++;
    } else {
      const { error } = await supabase.from('locations').update({ name: newName }).eq('id', id);
      if (error) {
        console.log(colors.red(`  ✗ Failed to update name: ${error.message}`));
        errors++;
      } else {
        console.log(colors.green(`  ✓ Fixed: "${loc.name}" → "${newName}"`));
        nameFixed++;
      }
    }
  }

  // 2. Fix descriptions
  console.log(colors.bold('\n--- Fixing descriptions ---\n'));
  for (const [id, newDesc] of Object.entries(DESCRIPTION_FIXES)) {
    const loc = await getLocationById(id);
    if (!loc) {
      console.log(colors.yellow(`  ⊘ ${id} - not found`));
      continue;
    }

    if (DRY_RUN) {
      const oldDesc = loc.description?.substring(0, 50) + '...' || '(none)';
      console.log(colors.gray(`  Would fix: ${loc.name}`));
      console.log(colors.gray(`    Old: ${oldDesc}`));
      console.log(colors.gray(`    New: ${newDesc.substring(0, 50)}...`));
      descFixed++;
    } else {
      const { error } = await supabase.from('locations').update({ description: newDesc }).eq('id', id);
      if (error) {
        console.log(colors.red(`  ✗ Failed to update ${loc.name}: ${error.message}`));
        errors++;
      } else {
        console.log(colors.green(`  ✓ Fixed description: ${loc.name}`));
        descFixed++;
      }
    }
  }

  // Summary
  console.log(colors.bold('\n========================================'));
  console.log(colors.bold('SUMMARY'));
  console.log(colors.bold('========================================\n'));
  console.log(`  ${colors.green(`✓ ${nameFixed} names fixed`)}`);
  console.log(`  ${colors.green(`✓ ${descFixed} descriptions fixed`)}`);
  if (errors > 0) {
    console.log(`  ${colors.red(`✗ ${errors} errors`)}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log(colors.yellow('This was a dry run. Use without --dry-run to apply changes.\n'));
  }
}

main().catch(console.error);
