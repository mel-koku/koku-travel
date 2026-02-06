#!/usr/bin/env npx tsx
/**
 * Data Investigation Script
 *
 * Runs exploratory queries to find "weird" location data that might not
 * be caught by existing DQ rules.
 */

import { fetchAllLocations } from './lib/db';
import { colors } from './lib/cli';
import type { Location } from './lib/types';

// Japan bounding box (approximate)
const JAPAN_BOUNDS = {
  minLat: 24.0,
  maxLat: 46.0,
  minLng: 122.0,
  maxLng: 154.0,
};

// City center coordinates (approximate)
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  tokyo: { lat: 35.6762, lng: 139.6503 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  fukuoka: { lat: 33.5904, lng: 130.4017 },
  sapporo: { lat: 43.0618, lng: 141.3545 },
  hiroshima: { lat: 34.3853, lng: 132.4553 },
  nara: { lat: 34.6851, lng: 135.8049 },
  kobe: { lat: 34.6901, lng: 135.1956 },
  kanazawa: { lat: 36.5613, lng: 136.6562 },
  nagoya: { lat: 35.1815, lng: 136.9066 },
  yokohama: { lat: 35.4437, lng: 139.6380 },
  sendai: { lat: 38.2682, lng: 140.8694 },
  nikko: { lat: 36.7500, lng: 139.5833 },
  hakone: { lat: 35.2325, lng: 139.1069 },
  kamakura: { lat: 35.3192, lng: 139.5467 },
  takayama: { lat: 36.1408, lng: 137.2522 },
};

// Suspicious keywords in names (use word boundaries to avoid false positives like "temple")
const SUSPICIOUS_NAME_PATTERNS = [
  /\btest\b/i,
  /\btemp\b/i,  // Won't match "temple"
  /\bdelete\b/i,
  /\btodo\b/i,
  /\bxxx\b/i,
  /\btbd\b/i,
  /\bplaceholder\b/i,
  /\bundefined\b/i,
  /\bnull\b/i,
];

// Keywords that suggest wrong category
const TEMPLE_KEYWORDS = ['temple', 'shrine', 'jinja', '-ji', '-gu', '-jingu', 'taisha', 'tera'];
// Note: FOOD_KEYWORDS check removed - too many false positives (Shimabara contains "bar", etc.)

// Skip list for false positives - valid names that start with numbers
const SKIP_UNUSUAL_NAME_IDS = new Set([
  '10-factory-dogo-shikoku-efad71c6',         // "10 Factory Dogo" - real restaurant name
  '138-tower-park-winter-illumination-chubu-030ec383', // "138 Tower Park" - real landmark
  '17-end-shimojishima-okinawa-9e7a175e',     // "17 End" - real landmark
  '175-deno-tantanmen-hokkaido-a8ff525b',     // "175 DENO Tantanmen" - real restaurant
  '19th-century-hall-meiji-mura-chubu-b18147e0', // "19th Century Hall" - real museum
  '21-seikinomori-beach-okinawa-760a7393',    // "21 Seikinomori Beach" - real beach
  '21-21-design-kanto-e1e44566',              // "21_21 Design" - famous museum
  '551-horai-honten-kansai-61690631',         // "551 Horai" - famous restaurant
  'fujiya-1935-kansai-5987789d',              // "Fujiya 1935" - real restaurant
  'otaniyaki-tamura-1784-shikoku-e16940e9',   // "OTANIYAKI tamura 1784" - real shop
]);

interface Finding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  locationId: string;
  locationName: string;
  city: string;
  category: string;
  details: string;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function investigate(): Promise<void> {
  console.log(colors.bold('\n🔍 Running Data Investigation...\n'));

  const locations = await fetchAllLocations();
  console.log(`Analyzing ${locations.length} locations...\n`);

  const findings: Finding[] = [];

  // ============================================================
  // 1. DISPLAY ISSUES
  // ============================================================
  console.log(colors.bold('=== Display Issues ===\n'));

  // 1a. Short/suspicious names (< 3 chars)
  const shortNames = locations.filter(loc => loc.name.length < 3);
  for (const loc of shortNames) {
    findings.push({
      type: 'SHORT_NAME',
      severity: 'high',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: `Name is only ${loc.name.length} characters`,
    });
  }

  // 1b. Suspicious keywords in names
  const suspiciousNames = locations.filter(loc =>
    SUSPICIOUS_NAME_PATTERNS.some(pattern => pattern.test(loc.name))
  );
  for (const loc of suspiciousNames) {
    const matchedPatterns = SUSPICIOUS_NAME_PATTERNS.filter(pattern => pattern.test(loc.name));
    findings.push({
      type: 'SUSPICIOUS_NAME',
      severity: 'high',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: `Contains suspicious keyword(s): ${matchedPatterns.map(p => p.source.replace(/\\b/g, '')).join(', ')}`,
    });
  }

  // 1c. Names with unusual characters (numbers at start, excessive punctuation)
  // Skip known valid names that start with numbers (restaurants, landmarks with numbers in name)
  const unusualCharNames = locations.filter(loc => {
    if (SKIP_UNUSUAL_NAME_IDS.has(loc.id)) return false;
    const name = loc.name;
    // Starts with number (but skip ordinals like "19th")
    if (/^\d/.test(name) && !/^\d+(st|nd|rd|th)\b/i.test(name)) return true;
    // Has more than 4 consecutive numbers (like addresses)
    if (/\d{5,}/.test(name)) return true;
    // Has unusual characters like brackets in weird places
    if (/\[[^\]]*\]|\([^)]*\)/.test(name) && name.match(/\[|\(/g)!.length > 2) return true;
    return false;
  });
  for (const loc of unusualCharNames) {
    findings.push({
      type: 'UNUSUAL_NAME_CHARS',
      severity: 'medium',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: 'Name contains unusual characters or patterns',
    });
  }

  // 1d. Very long names (> 100 chars)
  const longNames = locations.filter(loc => loc.name.length > 100);
  for (const loc of longNames) {
    findings.push({
      type: 'LONG_NAME',
      severity: 'low',
      locationId: loc.id,
      locationName: loc.name.substring(0, 50) + '...',
      city: loc.city,
      category: loc.category,
      details: `Name is ${loc.name.length} characters`,
    });
  }

  // 1e. Missing images
  const noImages = locations.filter(loc => !loc.image && !loc.primary_photo_url);
  console.log(`Locations without any image: ${noImages.length}`);

  // ============================================================
  // 2. FUNCTIONAL ISSUES
  // ============================================================
  console.log(colors.bold('\n=== Functional Issues ===\n'));

  // 2a. Coordinates outside Japan
  const outsideJapan = locations.filter(loc => {
    const coords = loc.coordinates || (loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : null);
    if (!coords) return false;
    return coords.lat < JAPAN_BOUNDS.minLat || coords.lat > JAPAN_BOUNDS.maxLat ||
           coords.lng < JAPAN_BOUNDS.minLng || coords.lng > JAPAN_BOUNDS.maxLng;
  });
  for (const loc of outsideJapan) {
    const coords = loc.coordinates || { lat: loc.lat!, lng: loc.lng! };
    findings.push({
      type: 'COORDS_OUTSIDE_JAPAN',
      severity: 'critical',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) are outside Japan`,
    });
  }

  // 2b. Coordinates far from claimed city (> 100km)
  const farFromCity = locations.filter(loc => {
    const coords = loc.coordinates || (loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : null);
    if (!coords) return false;
    const cityCenter = CITY_CENTERS[loc.city.toLowerCase()];
    if (!cityCenter) return false;
    const distance = haversineDistance(coords.lat, coords.lng, cityCenter.lat, cityCenter.lng);
    return distance > 100;
  });
  for (const loc of farFromCity) {
    const coords = loc.coordinates || { lat: loc.lat!, lng: loc.lng! };
    const cityCenter = CITY_CENTERS[loc.city.toLowerCase()];
    const distance = haversineDistance(coords.lat, coords.lng, cityCenter.lat, cityCenter.lng);
    findings.push({
      type: 'COORDS_FAR_FROM_CITY',
      severity: 'high',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: `${distance.toFixed(0)}km from ${loc.city} city center`,
    });
  }

  // 2c. Duplicate coordinates (exact match)
  const coordsMap = new Map<string, Location[]>();
  for (const loc of locations) {
    const coords = loc.coordinates || (loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : null);
    if (!coords) continue;
    // Round to 5 decimal places for matching
    const key = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
    if (!coordsMap.has(key)) {
      coordsMap.set(key, []);
    }
    coordsMap.get(key)!.push(loc);
  }
  const duplicateCoords = Array.from(coordsMap.entries()).filter(([_, locs]) => locs.length > 1);
  for (const [coords, locs] of duplicateCoords) {
    for (const loc of locs) {
      findings.push({
        type: 'DUPLICATE_COORDINATES',
        severity: 'medium',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        category: loc.category,
        details: `Shares exact coordinates (${coords}) with ${locs.length - 1} other location(s): ${locs.filter(l => l.id !== loc.id).map(l => l.name).join(', ')}`,
      });
    }
  }

  // 2d. Category mismatches - food locations that sound like temples
  const foodLikesTemple = locations.filter(loc => {
    if (loc.category !== 'food') return false;
    const name = loc.name.toLowerCase();
    return TEMPLE_KEYWORDS.some(kw => name.includes(kw));
  });
  for (const loc of foodLikesTemple) {
    findings.push({
      type: 'CATEGORY_MISMATCH_TEMPLE_IN_FOOD',
      severity: 'high',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: 'Food location has temple/shrine keywords in name',
    });
  }

  // 2e. Category mismatches - culture locations that sound like restaurants
  // REMOVED: Too many false positives (place names like "Shimabara" contain "bar")
  // Would need word-boundary matching to be useful

  // 2f. Closed businesses
  const closedBusinesses = locations.filter(loc =>
    loc.business_status === 'PERMANENTLY_CLOSED' || loc.business_status === 'CLOSED_PERMANENTLY'
  );
  for (const loc of closedBusinesses) {
    findings.push({
      type: 'PERMANENTLY_CLOSED',
      severity: 'high',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: `Business status: ${loc.business_status}`,
    });
  }

  // 2g. Missing coordinates (can't be mapped or route-optimized)
  const noCoords = locations.filter(loc => {
    const coords = loc.coordinates || (loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : null);
    return !coords;
  });
  console.log(`Locations without coordinates: ${noCoords.length}`);

  // 2h. Unrealistic durations (> 8 hours or < 5 minutes)
  const badDurations = locations.filter(loc => {
    if (!loc.estimated_duration) return false;
    return loc.estimated_duration > 480 || loc.estimated_duration < 5;
  });
  for (const loc of badDurations) {
    findings.push({
      type: 'UNREALISTIC_DURATION',
      severity: 'medium',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: `Duration: ${loc.estimated_duration} minutes`,
    });
  }

  // ============================================================
  // 3. DATA INTEGRITY ISSUES
  // ============================================================
  console.log(colors.bold('\n=== Data Integrity Issues ===\n'));

  // 3a. Descriptions that reference different locations
  // REMOVED: Too many false positives - descriptions legitimately mention nearby cities
  // (e.g., "near Tokyo", "between Kyoto and Osaka", etc.)

  // 3b. Descriptions that are just addresses (not real descriptions)
  const addressAsDescription = locations.filter(loc => {
    if (!loc.description) return false;
    const desc = loc.description.trim();
    // Matches Japanese address patterns or postal codes
    if (/^\d{3}-\d{4}/.test(desc)) return true; // Starts with postal code
    if (/^[A-Z]?-?\d+/.test(desc) && desc.includes('District')) return true; // Address format
    if (desc.length < 100 && /\d{3}-\d{4}/.test(desc)) return true; // Short with postal code
    return false;
  });
  for (const loc of addressAsDescription) {
    findings.push({
      type: 'ADDRESS_AS_DESCRIPTION',
      severity: 'high',
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      category: loc.category,
      details: 'Description appears to be an address, not a real description',
    });
  }

  // 3c. Duplicate descriptions (same exact description)
  const descriptionMap = new Map<string, Location[]>();
  for (const loc of locations) {
    if (!loc.description || loc.description.length < 50) continue; // Skip short/missing
    const key = loc.description.trim().toLowerCase();
    if (!descriptionMap.has(key)) {
      descriptionMap.set(key, []);
    }
    descriptionMap.get(key)!.push(loc);
  }
  const duplicateDescs = Array.from(descriptionMap.entries()).filter(([_, locs]) => locs.length > 1);
  for (const [desc, locs] of duplicateDescs) {
    for (const loc of locs) {
      findings.push({
        type: 'DUPLICATE_DESCRIPTION',
        severity: 'low',
        locationId: loc.id,
        locationName: loc.name,
        city: loc.city,
        category: loc.category,
        details: `Shares exact description with ${locs.length - 1} other location(s): ${locs.filter(l => l.id !== loc.id).map(l => l.name).join(', ')}`,
      });
    }
  }

  // ============================================================
  // REPORT FINDINGS
  // ============================================================
  console.log(colors.bold('\n========================================'));
  console.log(colors.bold('INVESTIGATION RESULTS'));
  console.log(colors.bold('========================================\n'));

  // Group by type
  const byType = new Map<string, Finding[]>();
  for (const finding of findings) {
    if (!byType.has(finding.type)) {
      byType.set(finding.type, []);
    }
    byType.get(finding.type)!.push(finding);
  }

  // Summary
  console.log(colors.bold('Summary by Issue Type:\n'));
  const sortedTypes = Array.from(byType.entries()).sort((a, b) => b[1].length - a[1].length);
  for (const [type, typeFindings] of sortedTypes) {
    const severity = typeFindings[0].severity;
    const color = severity === 'critical' ? colors.red :
                  severity === 'high' ? colors.red :
                  severity === 'medium' ? colors.yellow :
                  severity === 'low' ? colors.blue : colors.gray;
    console.log(`  ${color(`${type}`)}: ${typeFindings.length} issues (${severity})`);
  }

  console.log(`\n${colors.bold('Total findings:')} ${findings.length}\n`);

  // Detailed findings (show first 5 of each type)
  console.log(colors.bold('\n========================================'));
  console.log(colors.bold('DETAILED FINDINGS (First 5 of each type)'));
  console.log(colors.bold('========================================\n'));

  for (const [type, typeFindings] of sortedTypes) {
    console.log(colors.bold(`\n--- ${type} (${typeFindings.length} total) ---\n`));
    const shown = typeFindings.slice(0, 5);
    for (const finding of shown) {
      console.log(`  ID: ${finding.locationId}`);
      console.log(`  Name: ${finding.locationName}`);
      console.log(`  City: ${finding.city}, Category: ${finding.category}`);
      console.log(`  ${finding.details}`);
      console.log();
    }
    if (typeFindings.length > 5) {
      console.log(`  ... and ${typeFindings.length - 5} more\n`);
    }
  }

  // Export findings to JSON
  const outputFile = 'investigation-results.json';
  const output = {
    generatedAt: new Date().toISOString(),
    totalLocations: locations.length,
    totalFindings: findings.length,
    summary: Object.fromEntries(sortedTypes.map(([type, f]) => [type, f.length])),
    findings,
  };

  const fs = await import('fs');
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\n${colors.green(`Results exported to ${outputFile}`)}\n`);
}

investigate().catch(console.error);
