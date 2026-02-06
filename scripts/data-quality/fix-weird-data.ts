#!/usr/bin/env npx tsx
/**
 * Script to fix weird location data found during investigation
 *
 * Fixes:
 * 1. Delete 21 permanently closed businesses
 * 2. Fix city assignments for Kyushu locations wrongly marked as "Fukuoka"
 * 3. Fix coordinates for Myoryuji (Ninja Temple)
 * 4. Fix name for "8522 Komono" -> "Yunoyama Onsen"
 */

import { getSupabase, getLocationById } from './lib/db';
import { colors } from './lib/cli';

const DRY_RUN = process.argv.includes('--dry-run');

// Permanently closed businesses to delete
const PERMANENTLY_CLOSED = [
  'angelique-hirosaki-tohoku-60f77858',
  'cafe-contigo-shikoku-270943e8',
  'chojiro-shijo-kiyamachi-kansai-ac585bf0',
  'gaylord-kansai-e351051e',
  'hanakoji-sawada-hokkaido-dd356bc8',
  'hotate-goya-tohoku-b0fc6dda',
  'ikkaku-shikoku-97e969d4',
  'isaribi-shikoku-e2d3e838',
  'ishiya-cafe-hokkaido-aa10e6ab',
  'kihachiro-chubu-7b01fe90',
  'mellow-cafe-kansai-68c0a770',
  'nakamuraya-okinawa-5dd6e223',
  'oboke-koboke-gorge-shikoku-0a7f2436',
  'printemps-blanc-tohoku-e6a00faa',
  'ramen-sora-hokkaido-f4c549e4',
  'ryukyu-sabo-ashibiuna-okinawa-8577d176',
  'sandeco-coffee-sugaku-cafe-kyushu-5d18ea01',
  'sole-mare-okinawa-e860031a',
  'sushiya-kodai-hokkaido-80ca370a',
  'terakawa-kansai-ce3caf0c',
  'yokohama-hammerhead-japan-ramen-food-hall-kanto-7b34ef4d',
];

// City fixes for Kyushu locations wrongly marked as "Fukuoka"
const CITY_FIXES: Record<string, string> = {
  'yakushima-kyushu-e97fb61f': 'Yakushima',          // Yakushima Island
  'got-islands-kyushu-faef98f7': 'Goto',             // Gotō Islands
  'gunkanjima-kyushu-9c82140a': 'Nagasaki',          // Gunkanjima (Hashima Island)
  'yoron-folk-village-kyushu-114af43d': 'Yoron',     // Yoron Island
  'aso-nakadake-crater-1-kyushu-2784aa5d': 'Aso',    // Aso Nakadake Crater
  'futagoji-kyushu-c05e6e29': 'Kunisaki',            // Futagoji temple in Kunisaki
  'izumi-historical-museum-kyushu-b241dc93': 'Izumi', // Izumi Historical Museum
  'jigoku-onsen-kyushu-1ae87f02': 'Beppu',           // Jigoku Onsen in Beppu
  'kamishikimi-kumanoimasu-shrine-kyushu-3c09a560': 'Takamori', // Shrine near Takamori
  'beppu-onsen-kyushu-1ac02f74': 'Beppu',            // Takegawara Onsen in Beppu
  'tamatebako-open-air-onsen-kyushu-842610b2': 'Ibusuki', // Tamatebako in Ibusuki
  'usuki-stone-buddhas-kyushu-e1b73408': 'Usuki',    // Usuki Stone Buddhas
};

// Coordinate fixes
const COORDINATE_FIXES: Record<string, { lat: number; lng: number }> = {
  // Myoryuji (Ninja Temple) - real coordinates in Kanazawa
  'myoryuji-ninja-temple-chubu-3143d336': { lat: 36.5564, lng: 136.6539 },
};

// Name fixes
const NAME_FIXES: Record<string, string> = {
  'yunoyama-kansai-749262a6': 'Yunoyama Onsen',
};

async function main() {
  console.log(colors.bold(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fixing weird location data...\n`));

  const supabase = getSupabase();
  let deleted = 0;
  let cityFixed = 0;
  let coordFixed = 0;
  let nameFixed = 0;
  let errors = 0;

  // 1. Delete permanently closed businesses
  console.log(colors.bold('\n--- Deleting permanently closed businesses ---\n'));
  for (const id of PERMANENTLY_CLOSED) {
    const loc = await getLocationById(id);
    if (!loc) {
      console.log(colors.yellow(`  ⊘ ${id} - not found (already deleted?)`));
      continue;
    }

    if (DRY_RUN) {
      console.log(colors.gray(`  Would delete: ${loc.name} (${loc.city})`));
      deleted++;
    } else {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) {
        console.log(colors.red(`  ✗ Failed to delete ${loc.name}: ${error.message}`));
        errors++;
      } else {
        console.log(colors.green(`  ✓ Deleted: ${loc.name} (${loc.city})`));
        deleted++;
      }
    }
  }

  // 2. Fix city assignments
  console.log(colors.bold('\n--- Fixing city assignments ---\n'));
  for (const [id, newCity] of Object.entries(CITY_FIXES)) {
    const loc = await getLocationById(id);
    if (!loc) {
      console.log(colors.yellow(`  ⊘ ${id} - not found`));
      continue;
    }

    if (DRY_RUN) {
      console.log(colors.gray(`  Would fix: ${loc.name}: ${loc.city} → ${newCity}`));
      cityFixed++;
    } else {
      const { error } = await supabase.from('locations').update({ city: newCity }).eq('id', id);
      if (error) {
        console.log(colors.red(`  ✗ Failed to update ${loc.name}: ${error.message}`));
        errors++;
      } else {
        console.log(colors.green(`  ✓ Fixed: ${loc.name}: ${loc.city} → ${newCity}`));
        cityFixed++;
      }
    }
  }

  // 3. Fix coordinates
  console.log(colors.bold('\n--- Fixing coordinates ---\n'));
  for (const [id, coords] of Object.entries(COORDINATE_FIXES)) {
    const loc = await getLocationById(id);
    if (!loc) {
      console.log(colors.yellow(`  ⊘ ${id} - not found`));
      continue;
    }

    const oldCoords = loc.coordinates || { lat: loc.lat, lng: loc.lng };
    if (DRY_RUN) {
      console.log(colors.gray(`  Would fix: ${loc.name}: (${oldCoords.lat?.toFixed(4)}, ${oldCoords.lng?.toFixed(4)}) → (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`));
      coordFixed++;
    } else {
      const { error } = await supabase.from('locations').update({
        coordinates: coords,
        lat: coords.lat,
        lng: coords.lng
      }).eq('id', id);
      if (error) {
        console.log(colors.red(`  ✗ Failed to update ${loc.name}: ${error.message}`));
        errors++;
      } else {
        console.log(colors.green(`  ✓ Fixed: ${loc.name}: (${oldCoords.lat?.toFixed(4)}, ${oldCoords.lng?.toFixed(4)}) → (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`));
        coordFixed++;
      }
    }
  }

  // 4. Fix names
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
        console.log(colors.red(`  ✗ Failed to update ${loc.name}: ${error.message}`));
        errors++;
      } else {
        console.log(colors.green(`  ✓ Fixed: "${loc.name}" → "${newName}"`));
        nameFixed++;
      }
    }
  }

  // Summary
  console.log(colors.bold('\n========================================'));
  console.log(colors.bold('SUMMARY'));
  console.log(colors.bold('========================================\n'));
  console.log(`  ${colors.green(`✓ ${deleted} locations deleted`)}`);
  console.log(`  ${colors.green(`✓ ${cityFixed} city assignments fixed`)}`);
  console.log(`  ${colors.green(`✓ ${coordFixed} coordinates fixed`)}`);
  console.log(`  ${colors.green(`✓ ${nameFixed} names fixed`)}`);
  if (errors > 0) {
    console.log(`  ${colors.red(`✗ ${errors} errors`)}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log(colors.yellow('This was a dry run. Use without --dry-run to apply changes.\n'));
  }
}

main().catch(console.error);
