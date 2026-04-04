import type { Location } from "@/types/location";
import { scoreWeatherFit } from "@/lib/weather/weatherScoring";
import { scoreTimeOfDayFit, checkOpeningHoursFit } from "./timeOptimization";
import { scoreGroupFit } from "./groupScoring";

// Re-export shared types so the public API surface doesn't change
export type { LocationScoringCriteria, ScoreBreakdown, LocationScore } from "./types";
import type { LocationScoringCriteria, ScoreBreakdown, LocationScore } from "./types";

// Import all factor scoring functions
import {
  scoreInterestMatch,
  scoreRatingQuality,
  scoreBudgetFit,
  scoreAccessibilityFit,
  scoreLogisticalFit,
  scoreDiversity,
  scoreNeighborhoodDiversity,
  scoreSeasonalMatch,
  scoreContentFit,
  scoreDietaryFit,
  scoreCrowdFit,
  scorePhotoFit,
  scoreTagMatch,
  scoreAccommodationBonus,
  scoreUnescoBonus,
  scoreHiddenGemBonus,
} from "./factors";

/**
 * Score a location based on all criteria.
 */
export function scoreLocation(
  location: Location,
  criteria: LocationScoringCriteria,
): LocationScore {
  const rawInterestResult = scoreInterestMatch(location, criteria.interests, criteria.currentInterest);

  // Apply LLM-derived category weight multiplier
  const categoryWeight = criteria.categoryWeights && location.category
    ? criteria.categoryWeights[location.category.toLowerCase()] ?? 1.0
    : 1.0;
  const interestResult = categoryWeight !== 1.0
    ? {
        score: Math.round(rawInterestResult.score * categoryWeight),
        reasoning: `${rawInterestResult.reasoning} (×${categoryWeight.toFixed(1)} weight)`,
      }
    : rawInterestResult;

  const ratingResult = scoreRatingQuality(location, criteria.communityRatings);
  const logisticalResult = scoreLogisticalFit(location, criteria);

  // Short-circuit: location is too far away (hard -100 penalty).
  // Skip remaining 16 factor evaluations for locations that will never be selected.
  if (logisticalResult.score <= -100) {
    return {
      location,
      score: interestResult.score + ratingResult.score + logisticalResult.score,
      breakdown: {
        interestMatch: interestResult.score,
        ratingQuality: ratingResult.score,
        logisticalFit: logisticalResult.score,
        budgetFit: 0, accessibilityFit: 0, diversityBonus: 0,
        neighborhoodDiversity: 0, weatherFit: 0, timeOptimization: 0,
        groupFit: 0, seasonalFit: 0, contentFit: 0, dietaryFit: 0,
        crowdFit: 0, photoFit: 0, tagMatch: 0,
        accommodationBonus: 0, unescoBonus: 0,
      },
      reasoning: [interestResult.reasoning, ratingResult.reasoning, logisticalResult.reasoning],
    };
  }

  const budgetResult = scoreBudgetFit(location, {
    budgetLevel: criteria.budgetLevel,
    budgetTotal: criteria.budgetTotal,
    budgetPerDay: criteria.budgetPerDay,
  });
  const accessibilityResult = scoreAccessibilityFit(location, criteria.accessibility);
  const diversityResult = scoreDiversity(location, criteria.recentCategories);
  const neighborhoodResult = scoreNeighborhoodDiversity(location, criteria.recentNeighborhoods ?? [], criteria.isZoneClustered);
  const weatherResult = scoreWeatherFit(location, criteria.weatherForecast, criteria.weatherPreferences);

  // Time-of-day optimization scoring
  const timeOptimizationResult = criteria.timeSlot
    ? scoreTimeOfDayFit(location, criteria.timeSlot, criteria.date)
    : { scoreAdjustment: 0, reasoning: "No time slot specified" };

  // Check opening hours fit
  const openingHoursResult = criteria.timeSlot
    ? checkOpeningHoursFit(location, criteria.timeSlot, criteria.date)
    : { fits: true, reasoning: "No time slot specified" };

  // Adjust time optimization score if opening hours don't fit
  const finalTimeScore = openingHoursResult.fits
    ? timeOptimizationResult.scoreAdjustment
    : timeOptimizationResult.scoreAdjustment - 5; // Penalty for closed hours

  // Group-based scoring
  const groupResult = scoreGroupFit(location, criteria.group);

  // Seasonal scoring
  const seasonalResult = scoreSeasonalMatch(location, criteria.tripMonth);

  // Content fit scoring (guide/experience editorial boost)
  const contentResult = scoreContentFit(location, criteria.contentLocationIds);

  // Dietary fit scoring (soft factor for food categories)
  const dietaryResult = scoreDietaryFit(location, criteria.dietaryRestrictions);

  // Crowd fit scoring
  const crowdResult = scoreCrowdFit(location, criteria);

  // Photo timing fit scoring
  const photoResult = scorePhotoFit(location, criteria);

  // Tag match scoring (AI intent preferred tags)
  const tagMatchResult = scoreTagMatch(location, criteria.preferredTags);

  // Hidden gem scoring: two layers
  const hiddenGem = scoreHiddenGemBonus(location, criteria.hasLocalSecretsVibe, tagMatchResult.score);

  // Accommodation style bonus: ryokan guests prefer onsen/garden/nature/wellness
  const accommodationBonus = scoreAccommodationBonus(location, criteria.accommodationStyle);

  // UNESCO World Heritage Site bonus
  const unesco = scoreUnescoBonus(location, criteria.hasHeritageVibe);

  const breakdown: ScoreBreakdown = {
    interestMatch: interestResult.score,
    ratingQuality: ratingResult.score,
    logisticalFit: logisticalResult.score,
    budgetFit: budgetResult.score,
    accessibilityFit: accessibilityResult.score,
    diversityBonus: diversityResult.score,
    neighborhoodDiversity: neighborhoodResult.score,
    weatherFit: weatherResult.scoreAdjustment,
    timeOptimization: finalTimeScore,
    groupFit: groupResult.scoreAdjustment,
    seasonalFit: seasonalResult.scoreAdjustment,
    contentFit: contentResult.score,
    dietaryFit: dietaryResult.score,
    crowdFit: crowdResult.score,
    photoFit: photoResult.score,
    tagMatch: tagMatchResult.score,
    accommodationBonus,
    unescoBonus: unesco.total,
  };

  const totalScore =
    breakdown.interestMatch +
    breakdown.ratingQuality +
    breakdown.logisticalFit +
    breakdown.budgetFit +
    breakdown.accessibilityFit +
    breakdown.diversityBonus +
    breakdown.neighborhoodDiversity +
    breakdown.weatherFit +
    breakdown.timeOptimization +
    breakdown.groupFit +
    breakdown.seasonalFit +
    breakdown.contentFit +
    breakdown.dietaryFit +
    breakdown.crowdFit +
    breakdown.photoFit +
    breakdown.tagMatch +
    accommodationBonus +
    hiddenGem.total +
    unesco.total;

  const reasoning = [
    interestResult.reasoning,
    ratingResult.reasoning,
    logisticalResult.reasoning,
    budgetResult.reasoning,
    accessibilityResult.reasoning,
    diversityResult.reasoning,
    neighborhoodResult.reasoning,
    weatherResult.reasoning,
    timeOptimizationResult.reasoning,
    openingHoursResult.reasoning,
    groupResult.reasoning,
    seasonalResult.reasoning,
    ...(contentResult.reasoning ? [contentResult.reasoning] : []),
    ...(dietaryResult.reasoning ? [dietaryResult.reasoning] : []),
    ...(crowdResult.reasoning ? [crowdResult.reasoning] : []),
    ...(photoResult.reasoning ? [photoResult.reasoning] : []),
    ...(tagMatchResult.reasoning ? [tagMatchResult.reasoning] : []),
    ...(hiddenGem.localSecretsBonus > 0 ? [`Hidden gem + local_secrets vibe: +${hiddenGem.localSecretsBonus}`] : []),
    ...(hiddenGem.tagBonus > 0 ? [`Hidden gem + tag preference match: +${hiddenGem.tagBonus}`] : []),
    ...(hiddenGem.iconicPenalty < 0 ? [`Iconic location penalty (local_secrets): ${hiddenGem.iconicPenalty}`] : []),
    ...(unesco.base > 0 ? [`UNESCO World Heritage Site: +${unesco.base}`] : []),
    ...(unesco.vibe > 0 ? [`UNESCO + heritage vibe: +${unesco.vibe}`] : []),
    ...(accommodationBonus > 0 ? [`Ryokan stay bonus: +${accommodationBonus} for ${location.category}`] : []),
  ];

  return {
    location,
    score: totalScore,
    breakdown,
    reasoning,
  };
}
