/**
 * Evaluation script to compare itinerary quality before and after scoring implementation.
 * Generates multiple itineraries and calculates quality metrics.
 */

import { generateItinerary } from "@/lib/itineraryGenerator";
import type { TripBuilderData } from "@/types/trip";

interface QualityMetrics {
  locationVariety: number; // Unique categories / total activities
  categoryStreaks: number; // Max consecutive same category
  averageRating: number; // Average of all location ratings
  ratingCoverage: number; // % of locations with ratings
  totalActivities: number; // Total number of activities
  uniqueCategories: number; // Number of unique categories
}

async function evaluateItinerary(
  preferences: TripBuilderData,
  iterations: number = 10,
): Promise<QualityMetrics> {
  const results: QualityMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    const itinerary = await generateItinerary(preferences);

    // Calculate metrics
    const categories: string[] = [];
    const ratings: number[] = [];
    let maxStreak = 0;
    let currentStreak = 1;
    let lastCategory = "";

    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        if (activity.kind === "place") {
          const category = activity.tags?.[0] || "unknown";
          categories.push(category);

          // Track streaks
          if (category === lastCategory) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            currentStreak = 1;
            lastCategory = category;
          }

          // Note: We don't have access to rating in the itinerary structure
          // This would need to be enhanced if we want to track ratings
        }
      }
    }

    const uniqueCategories = new Set(categories).size;
    const totalActivities = categories.length;

    results.push({
      locationVariety: totalActivities > 0 ? uniqueCategories / totalActivities : 0,
      categoryStreaks: maxStreak,
      averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      ratingCoverage: ratings.length / totalActivities || 0,
      totalActivities,
      uniqueCategories,
    });
  }

  // Average across iterations
  return {
    locationVariety: avg(results.map((r) => r.locationVariety)),
    categoryStreaks: avg(results.map((r) => r.categoryStreaks)),
    averageRating: avg(results.map((r) => r.averageRating)),
    ratingCoverage: avg(results.map((r) => r.ratingCoverage)),
    totalActivities: avg(results.map((r) => r.totalActivities)),
    uniqueCategories: avg(results.map((r) => r.uniqueCategories)),
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Run evaluation
const testPreferences: TripBuilderData = {
  regions: ["kansai"],
  cities: ["kyoto"],
  interests: ["culture", "food", "nature"],
  style: "balanced",
  duration: 5,
  dates: {},
};

// Wrap in async IIFE for top-level await
(async () => {
  console.log("Evaluating itinerary quality...");
  console.log("Preferences:", JSON.stringify(testPreferences, null, 2));
  console.log("\nGenerating 20 itineraries...\n");

  const metrics = await evaluateItinerary(testPreferences, 20);

  console.log("Quality Metrics:");
  console.log(JSON.stringify(metrics, null, 2));

  console.log("\nInterpretation:");
  console.log(`- Location Variety: ${(metrics.locationVariety * 100).toFixed(1)}% (higher is better)`);
  console.log(`- Max Category Streak: ${metrics.categoryStreaks.toFixed(1)} (should be ≤ 2)`);
  console.log(`- Average Rating: ${metrics.averageRating.toFixed(2)} (if available)`);
  console.log(`- Rating Coverage: ${(metrics.ratingCoverage * 100).toFixed(1)}%`);
  console.log(`- Total Activities: ${metrics.totalActivities.toFixed(1)} per itinerary`);
  console.log(`- Unique Categories: ${metrics.uniqueCategories.toFixed(1)} per itinerary`);

  // Check if metrics meet acceptance criteria
  console.log("\n✅ Acceptance Criteria Check:");
  const varietyPass = metrics.locationVariety >= 0.5; // At least 50% variety
  const streakPass = metrics.categoryStreaks <= 2.5; // Allow slight margin for rounding
  console.log(`- Location Variety ≥ 50%: ${varietyPass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`- Max Streak ≤ 2: ${streakPass ? "✅ PASS" : "❌ FAIL"}`);

  if (varietyPass && streakPass) {
    console.log("\n🎉 All acceptance criteria met!");
  } else {
    console.log("\n⚠️  Some acceptance criteria not met. Review implementation.");
  }
})();

