#!/usr/bin/env tsx
/**
 * Validate city coordinates and region assignments in cityInterests.json.
 *
 * This script checks for:
 * 1. Coordinates outside the assigned region's bounding box
 * 2. Coordinates closer to a different region's center
 * 3. Duplicate coordinates (multiple cities with same coords)
 * 4. Outlier cities far from their region
 *
 * Output: Categorized report with CRITICAL, MEDIUM, and LOW issues
 *
 * Usage: npx tsx scripts/validate-city-coordinates.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Import region data types and definitions
interface RegionData {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// Define regions inline to avoid import issues
const REGIONS: Record<string, RegionData> = {
  hokkaido: {
    id: "hokkaido",
    name: "Hokkaido",
    center: { lat: 43.0642, lng: 141.3469 },
    bounds: { north: 45.5, south: 41.4, east: 145.9, west: 139.3 },
  },
  tohoku: {
    id: "tohoku",
    name: "Tohoku",
    center: { lat: 39.7036, lng: 140.1023 },
    bounds: { north: 41.5, south: 37.0, east: 142.1, west: 139.0 },
  },
  kanto: {
    id: "kanto",
    name: "Kanto",
    center: { lat: 35.6762, lng: 139.6503 },
    bounds: { north: 37.0, south: 34.5, east: 140.9, west: 138.2 },
  },
  chubu: {
    id: "chubu",
    name: "Chubu",
    center: { lat: 35.9, lng: 137.5 },
    bounds: { north: 37.5, south: 34.5, east: 139.2, west: 135.8 },
  },
  kansai: {
    id: "kansai",
    name: "Kansai",
    center: { lat: 34.6937, lng: 135.5023 },
    bounds: { north: 36.0, south: 33.4, east: 136.8, west: 134.0 },
  },
  chugoku: {
    id: "chugoku",
    name: "Chugoku",
    center: { lat: 34.6657, lng: 133.0 },
    bounds: { north: 36.0, south: 33.5, east: 134.5, west: 130.8 },
  },
  shikoku: {
    id: "shikoku",
    name: "Shikoku",
    center: { lat: 33.8416, lng: 133.5383 },
    bounds: { north: 34.5, south: 32.7, east: 134.8, west: 132.0 },
  },
  kyushu: {
    id: "kyushu",
    name: "Kyushu",
    center: { lat: 33.0, lng: 131.0 },
    bounds: { north: 34.3, south: 31.0, east: 132.1, west: 129.5 },
  },
  okinawa: {
    id: "okinawa",
    name: "Okinawa",
    center: { lat: 26.2124, lng: 127.6809 },
    bounds: { north: 27.5, south: 24.0, east: 131.5, west: 122.9 },
  },
};

const REGION_NAME_TO_ID: Record<string, string> = {
  Hokkaido: "hokkaido",
  Tohoku: "tohoku",
  Kanto: "kanto",
  Chubu: "chubu",
  Kansai: "kansai",
  Chugoku: "chugoku",
  Shikoku: "shikoku",
  Kyushu: "kyushu",
  Okinawa: "okinawa",
};

interface CityMetadata {
  locationCount: number;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface CityInterestsData {
  generatedAt: string;
  totalLocations: number;
  totalCities: number;
  cities: Record<string, unknown>;
  metadata: Record<string, CityMetadata>;
}

interface Issue {
  city: string;
  region: string;
  coords: { lat: number; lng: number };
  message: string;
  suggestedRegion?: string;
  suggestedCoords?: { lat: number; lng: number };
  distanceToAssigned?: number;
  distanceToClosest?: number;
}

// Haversine formula to calculate distance between two coordinates in km
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if coordinates are within region bounds
function isWithinBounds(
  lat: number,
  lng: number,
  bounds: RegionData["bounds"]
): boolean {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

// Find the closest region to given coordinates
function findClosestRegion(
  lat: number,
  lng: number
): { region: string; distance: number } {
  let closest = { region: "", distance: Infinity };

  for (const [regionId, regionData] of Object.entries(REGIONS)) {
    const distance = haversineDistance(
      lat,
      lng,
      regionData.center.lat,
      regionData.center.lng
    );
    if (distance < closest.distance) {
      closest = { region: regionData.name, distance };
    }
  }

  return closest;
}

// Find distance to assigned region center
function getDistanceToRegion(
  lat: number,
  lng: number,
  regionName: string
): number {
  const regionId = REGION_NAME_TO_ID[regionName];
  if (!regionId) return Infinity;
  const region = REGIONS[regionId];
  return haversineDistance(lat, lng, region.center.lat, region.center.lng);
}

// Known administrative quirks (cities that are administratively in one region but geographically near another)
const ADMINISTRATIVE_QUIRKS: Record<string, string> = {
  // Niigata Prefecture is in Chubu but borders Tohoku
  Niigata: "Niigata is administratively in Chubu but geographically borders Tohoku",
  Sado: "Sado Island is administratively in Chubu (Niigata) but isolated",
  Joetsu: "Joetsu is administratively in Chubu (Niigata) but near Tohoku",
  Nagaoka: "Nagaoka is administratively in Chubu (Niigata) but near Tohoku border",
  Shibata: "Shibata is administratively in Chubu (Niigata) but near Tohoku border",
  Sanjo: "Sanjo is administratively in Chubu (Niigata) but near Kanto border",
  Tsubame: "Tsubame is administratively in Chubu (Niigata) but near Kanto border",
  Agano: "Agano is administratively in Chubu (Niigata) but near Tohoku border",
  Gosen: "Gosen is administratively in Chubu (Niigata) but near Kanto border",
  Iwafune: "Iwafune is administratively in Chubu (Niigata) but near Tohoku border",
  // Mie Prefecture is in Kansai but near Chubu
  Mie: "Mie is administratively in Kansai but near Chubu border",
  Ise: "Ise is administratively in Kansai (Mie) but near Chubu border",
  Toba: "Toba is administratively in Kansai (Mie) but near Chubu border",
  // Oki Islands
  Oki: "Oki Islands are administratively in Chugoku (Shimane) but north of main region",
  // Amami Islands are administratively Kagoshima (Kyushu) but near Okinawa
  Oshima: "Amami Oshima is administratively in Kyushu (Kagoshima) but geographically near Okinawa",
  Yoron: "Yoron Island is administratively in Kyushu (Kagoshima) but geographically near Okinawa",
  Amami: "Amami is administratively in Kyushu (Kagoshima) but geographically near Okinawa",
  Tokunoshima: "Tokunoshima is administratively in Kyushu (Kagoshima) but geographically near Okinawa",
  // Shizuoka is on the Chubu/Kanto border
  Atami: "Atami is administratively in Chubu (Shizuoka) but on the Kanto border",
  Ito: "Ito is administratively in Chubu (Shizuoka) but on the Kanto border",
  Izu: "Izu is administratively in Chubu (Shizuoka) but on the Kanto border",
  // Fukui is in Chubu but near Kansai
  Oi: "Oi is administratively in Chubu (Fukui) but near Kansai border",
  // Fukushima is in Tohoku but near Kanto
  Hinoemata: "Hinoemata is administratively in Tohoku (Fukushima) but near Kanto border",
  // Aomori is in Tohoku but near Hokkaido
  Oma: "Oma is administratively in Tohoku (Aomori) but near Hokkaido",
};

function validateCityCoordinates() {
  // Load cityInterests.json
  const dataPath = resolve(process.cwd(), "src/data/cityInterests.json");
  const data: CityInterestsData = JSON.parse(readFileSync(dataPath, "utf-8"));

  const criticalIssues: Issue[] = [];
  const mediumIssues: Issue[] = [];
  const lowIssues: Issue[] = [];

  // Track coordinates to find duplicates
  const coordMap = new Map<string, string[]>();

  console.log("=== City Coordinate Validation Report ===\n");
  console.log(`Total cities: ${Object.keys(data.metadata).length}\n`);

  for (const [cityName, meta] of Object.entries(data.metadata)) {
    const { region, coordinates } = meta;
    const { lat, lng } = coordinates;

    // Track for duplicate detection
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (!coordMap.has(coordKey)) {
      coordMap.set(coordKey, []);
    }
    coordMap.get(coordKey)!.push(cityName);

    const regionId = REGION_NAME_TO_ID[region];
    if (!regionId) {
      criticalIssues.push({
        city: cityName,
        region,
        coords: { lat, lng },
        message: `Unknown region "${region}"`,
      });
      continue;
    }

    // Check for known administrative quirks first - these are not bugs
    if (ADMINISTRATIVE_QUIRKS[cityName]) {
      const distanceToAssigned = getDistanceToRegion(lat, lng, region);
      lowIssues.push({
        city: cityName,
        region,
        coords: { lat, lng },
        message: ADMINISTRATIVE_QUIRKS[cityName],
        distanceToAssigned: Math.round(distanceToAssigned),
      });
      continue;
    }

    const regionData = REGIONS[regionId];
    const withinBounds = isWithinBounds(lat, lng, regionData.bounds);
    const distanceToAssigned = getDistanceToRegion(lat, lng, region);
    const closest = findClosestRegion(lat, lng);

    // Check for critical issues: coords WAY outside region (>150km from center, and closer to another region)
    if (distanceToAssigned > 150 && closest.region !== region) {
      const distanceRatio = distanceToAssigned / closest.distance;

      // If assigned region is more than 2x farther than closest, it's critical
      if (distanceRatio > 2) {
        criticalIssues.push({
          city: cityName,
          region,
          coords: { lat, lng },
          message: `Coordinates are ${Math.round(distanceToAssigned)}km from ${region} center, but only ${Math.round(closest.distance)}km from ${closest.region}`,
          suggestedRegion: closest.region,
          distanceToAssigned: Math.round(distanceToAssigned),
          distanceToClosest: Math.round(closest.distance),
        });
        continue;
      }
    }

    // Check for medium issues: outside bounds but not too far
    if (!withinBounds && closest.region !== region) {
      mediumIssues.push({
        city: cityName,
        region,
        coords: { lat, lng },
        message: `Coords outside ${region} bounds. Distance to ${region}: ${Math.round(distanceToAssigned)}km, to ${closest.region}: ${Math.round(closest.distance)}km`,
        suggestedRegion: closest.region,
        distanceToAssigned: Math.round(distanceToAssigned),
        distanceToClosest: Math.round(closest.distance),
      });
    }
  }

  // Check for duplicate coordinates
  const duplicates: { coordKey: string; cities: string[] }[] = [];
  for (const [coordKey, cities] of coordMap.entries()) {
    if (cities.length > 1) {
      duplicates.push({ coordKey, cities });
    }
  }

  // Output report
  console.log("=" .repeat(60));
  console.log("CRITICAL ISSUES (Wrong coordinates - needs fix):");
  console.log("=" .repeat(60));
  if (criticalIssues.length === 0) {
    console.log("  None found!\n");
  } else {
    for (const issue of criticalIssues) {
      console.log(`\n  ${issue.city} in ${issue.region}:`);
      console.log(`    Coords: (${issue.coords.lat}, ${issue.coords.lng})`);
      console.log(`    ${issue.message}`);
      if (issue.suggestedRegion) {
        console.log(`    Suggested: Move to ${issue.suggestedRegion} or update coordinates`);
      }
    }
    console.log();
  }

  console.log("=" .repeat(60));
  console.log("DUPLICATE COORDINATES (Multiple cities with same location):");
  console.log("=" .repeat(60));
  if (duplicates.length === 0) {
    console.log("  None found!\n");
  } else {
    for (const dup of duplicates) {
      console.log(`\n  Coordinates ${dup.coordKey}:`);
      console.log(`    Cities: ${dup.cities.join(", ")}`);
    }
    console.log();
  }

  console.log("=" .repeat(60));
  console.log("MEDIUM ISSUES (Region assignment questionable):");
  console.log("=" .repeat(60));
  if (mediumIssues.length === 0) {
    console.log("  None found!\n");
  } else {
    for (const issue of mediumIssues) {
      console.log(`\n  ${issue.city} in ${issue.region}:`);
      console.log(`    Coords: (${issue.coords.lat}, ${issue.coords.lng})`);
      console.log(`    ${issue.message}`);
    }
    console.log();
  }

  console.log("=" .repeat(60));
  console.log("LOW PRIORITY (Administrative quirks - no action needed):");
  console.log("=" .repeat(60));
  if (lowIssues.length === 0) {
    console.log("  None found!\n");
  } else {
    for (const issue of lowIssues) {
      console.log(`\n  ${issue.city} in ${issue.region}:`);
      console.log(`    ${issue.message}`);
    }
    console.log();
  }

  // Summary
  console.log("=" .repeat(60));
  console.log("SUMMARY:");
  console.log("=" .repeat(60));
  console.log(`  Critical issues: ${criticalIssues.length}`);
  console.log(`  Duplicate coordinates: ${duplicates.length}`);
  console.log(`  Medium issues: ${mediumIssues.length}`);
  console.log(`  Low priority (quirks): ${lowIssues.length}`);
  console.log();

  // Return exit code based on critical issues
  if (criticalIssues.length > 0) {
    process.exit(1);
  }
}

validateCityCoordinates();
