import type { Location, Weekday } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import type { WeatherForecast } from "@/types/weather";
import type { CityId } from "@/types/trip";
import { fetchLocationSpecificGuidance } from "./guidanceService";
import type { TravelGuidance } from "@/types/travelGuidance";
import { CROWD_OVERRIDE_MAP, getActiveHolidays } from "@/data/crowdPatterns";

/** Max important tips surfaced per activity */
const MAX_IMPORTANT = 3;
/** Max total tips surfaced per activity */
const MAX_TOTAL = 5;

/**
 * Contextual tip for an activity
 */
export type ActivityTip = {
  /**
   * Type of tip
   */
  type: "crowd" | "photo" | "weather" | "timing" | "accessibility" | "budget" | "general" | "travel" | "payment" | "reservation" | "etiquette";
  /**
   * Tip title
   */
  title: string;
  /**
   * Tip message
   */
  message: string;
  /**
   * Priority (higher = more important)
   */
  priority: number;
  /**
   * Optional icon emoji
   */
  icon?: string;
  /**
   * Is this an important/critical tip?
   */
  isImportant?: boolean;
  /**
   * Cultural pillar this tip relates to (e.g. "kegare", "omotenashi")
   */
  pillar?: string;
};

/**
 * Generate contextual tips for an activity
 */
export function generateActivityTips(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  location: Location,
  options?: {
    weatherForecast?: WeatherForecast;
    allActivities?: ItineraryActivity[];
    dayIndex?: number;
    cityId?: CityId;
    activityDate?: Date;
  },
): ActivityTip[] {
  const tips: ActivityTip[] = [];

  // Travel tips (based on travel segment to this activity)
  const travelTips = generateTravelTips(activity, options?.allActivities);
  tips.push(...travelTips);

  // Reservation tips
  const reservationTips = generateReservationTips(location, activity);
  tips.push(...reservationTips);

  // Payment tips
  const paymentTips = generatePaymentTips(location, activity);
  tips.push(...paymentTips);

  // Crowd avoidance tips
  const crowdTips = generateCrowdTips(location, activity, options);
  tips.push(...crowdTips);

  // Photo tips
  const photoTips = generatePhotoTips(location, activity);
  tips.push(...photoTips);

  // Weather tips
  if (options?.weatherForecast) {
    const weatherTips = generateWeatherTips(location, activity, options.weatherForecast);
    tips.push(...weatherTips);
  }

  // Timing tips
  const timingTips = generateTimingTips(location, activity);
  tips.push(...timingTips);

  // Last-train tips (evening nightlife activities in major cities)
  if (options?.cityId) {
    const lastTrainTips = generateLastTrainTips(location, activity, options.cityId);
    tips.push(...lastTrainTips);
  }

  // Holiday-aware crowd tip (escalated for known-crowded places on busy dates)
  if (options?.activityDate) {
    const holidayCrowdTips = generateHolidayAwareCrowdTips(location, options.activityDate);
    tips.push(...holidayCrowdTips);
  }

  // Accessibility tips
  const accessibilityTips = generateAccessibilityTips(location);
  tips.push(...accessibilityTips);

  // Budget tips
  const budgetTips = generateBudgetTips(location);
  tips.push(...budgetTips);

  // General tips
  const generalTips = generateGeneralTips(location, activity);
  tips.push(...generalTips);

  // Cap both important and non-important tips to prevent overcrowding
  const important = tips
    .filter((t) => t.isImportant)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_IMPORTANT);
  const rest = tips
    .filter((t) => !t.isImportant)
    .sort((a, b) => b.priority - a.priority);
  const result = [...important];
  for (const tip of rest) {
    if (result.length >= MAX_TOTAL) break;
    result.push(tip);
  }
  return result;
}

/**
 * Generate contextual tips for an activity, including etiquette tips from database.
 * This is the async version that fetches travel guidance from the database.
 */
export async function generateActivityTipsAsync(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  location: Location,
  options?: {
    weatherForecast?: WeatherForecast;
    allActivities?: ItineraryActivity[];
    dayIndex?: number;
    activityDate?: Date;
    cityId?: CityId;
  },
): Promise<ActivityTip[]> {
  // Get the base tips synchronously
  const tips = generateActivityTips(activity, location, options);

  // Fetch location-specific etiquette tips from database
  // General tips are shown at the day level, not on individual cards
  try {
    const guidanceTips = await fetchLocationSpecificGuidance(location, options?.activityDate);
    const etiquetteTips = guidanceTips.map(guidanceToActivityTip);
    tips.push(...etiquetteTips);
  } catch {
    // Silently fail - we still have the base tips
  }

  // Cap both important and non-important tips to prevent overcrowding
  const important = tips
    .filter((t) => t.isImportant)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_IMPORTANT);
  const rest = tips
    .filter((t) => !t.isImportant)
    .sort((a, b) => b.priority - a.priority);
  const result = [...important];
  for (const tip of rest) {
    if (result.length >= MAX_TOTAL) break;
    result.push(tip);
  }
  return result;
}

/**
 * Convert a TravelGuidance entry to an ActivityTip.
 */
function guidanceToActivityTip(guidance: TravelGuidance): ActivityTip {
  return {
    type: "etiquette",
    title: guidance.title,
    message: guidance.summary,
    priority: guidance.priority,
    icon: guidance.icon ?? "🙏",
    isImportant: guidance.priority >= 8,
    pillar: guidance.pillarSlug ?? undefined,
  };
}

/**
 * Generate crowd avoidance tips
 */
function generateCrowdTips(
  location: Location,
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  _options?: { allActivities?: ItineraryActivity[]; dayIndex?: number },
): ActivityTip[] {
  const tips: ActivityTip[] = [];
  const category = location.category?.toLowerCase() ?? "";

  // Popular categories that tend to be crowded
  const crowdedCategories = ["shrine", "temple", "landmark", "museum", "viewpoint"];

  if (crowdedCategories.includes(category)) {
    // Morning visits are less crowded
    if (activity.timeOfDay === "morning") {
      tips.push({
        type: "crowd",
        title: "Early Visit Advantage",
        message: "Visiting in the morning helps avoid peak crowds. Arrive before 10 AM for the best experience.",
        priority: 7,
        icon: "🌅",
      });
    } else if (activity.timeOfDay === "afternoon") {
      tips.push({
        type: "crowd",
        title: "Peak Hours",
        message: "Afternoon is typically the busiest time. Consider arriving early morning or late afternoon to avoid crowds.",
        priority: 8,
        icon: "👥",
      });
    }
  }

  // High-rated locations are more popular. Skip the generic tip when the
  // location has a curated peakWarning — that surface produces better,
  // location-specific copy (via CROWD_OVERRIDES.peakWarning). Raised the
  // threshold from 4.5 to 4.7 because nearly every curated location is 4.5+,
  // so the old trigger was wallpaper.
  const hasCrowdOverride = CROWD_OVERRIDE_MAP.has(location.id);
  if (!hasCrowdOverride && location.rating && location.rating >= 4.7) {
    tips.push({
      type: "crowd",
      title: "Popular Destination",
      message: "This is a highly-rated location and may be crowded. Consider booking tickets in advance if available.",
      priority: 6,
      icon: "⭐",
    });
  }

  return tips;
}

/**
 * Generate photo tips
 */
function generatePhotoTips(
  location: Location,
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): ActivityTip[] {
  const tips: ActivityTip[] = [];
  const category = location.category?.toLowerCase() ?? "";

  // Golden hour tips
  if (category === "viewpoint" || category === "garden" || category === "shrine" || category === "temple") {
    if (activity.timeOfDay === "morning") {
      tips.push({
        type: "photo",
        title: "Golden Hour Photography",
        message: "Morning light is perfect for photography here. The soft light creates beautiful shadows and highlights.",
        priority: 6,
        icon: "📸",
      });
    } else if (activity.timeOfDay === "evening") {
      tips.push({
        type: "photo",
        title: "Sunset Photography",
        message: "Evening visits offer stunning sunset views. Arrive 30 minutes before sunset for the best lighting.",
        priority: 7,
        icon: "🌅",
      });
    }
  }

  return tips;
}

/**
 * Generate weather tips
 */
function generateWeatherTips(
  location: Location,
  _activity: Extract<ItineraryActivity, { kind: "place" }>,
  weatherForecast: WeatherForecast,
): ActivityTip[] {
  const tips: ActivityTip[] = [];
  const category = location.category?.toLowerCase() ?? "";

  // Rain tips
  if (weatherForecast.condition === "rain" || weatherForecast.condition === "drizzle") {
    // Rain-proof: indoor or covered venues where rain doesn't change the experience.
    // Distinct from "indoor": shrines/temples have indoor halls but are largely outdoor visits.
    const RAIN_PROOF_CATEGORIES = new Set([
      "museum", "shopping", "restaurant", "cafe", "bar",
      "onsen", "wellness", "aquarium", "theater", "entertainment", "craft", "culture",
    ]);
    const isRainProof = RAIN_PROOF_CATEGORIES.has(category);

    if (isRainProof) {
      tips.push({
        type: "weather",
        title: "Perfect for Rainy Day",
        message: "This indoor location is ideal for rainy weather. You'll stay dry while exploring.",
        priority: 8,
        icon: "☔",
      });
    } else {
      tips.push({
        type: "weather",
        title: "Rain expected",
        message: "Rain is forecast. Grab a clear vinyl umbrella at any konbini (about \u00A5500). Temple paths and stone steps get slippery. Consider shifting outdoor plans earlier or later.",
        priority: 9,
        icon: "🌧️",
      });
    }
  }

  // Temperature tips
  if (weatherForecast.temperature) {
    const { min, max } = weatherForecast.temperature;
    const avgTemp = (min + max) / 2;

    if (avgTemp < 10) {
      tips.push({
        type: "weather",
        title: "Bundle up",
        message: "Cold today. Temples and shrines have no heating, and you'll be removing shoes on cold wooden floors. Layer up and carry hand warmers (available at any konbini).",
        priority: 7,
        icon: "🧥",
      });
    } else if (avgTemp > 30) {
      tips.push({
        type: "weather",
        title: "Heat advisory",
        message: "Hot and humid today. Vending machines and konbini are everywhere for cold drinks. Duck into department stores or shopping arcades for AC breaks. Watch for signs of heat exhaustion.",
        priority: 8,
        icon: "🌡️",
        isImportant: avgTemp > 35,
      });
    }
  }

  return tips;
}

/**
 * Generate timing tips
 */
function generateTimingTips(
  location: Location,
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): ActivityTip[] {
  const tips: ActivityTip[] = [];
  const category = location.category?.toLowerCase() ?? "";

  // Operating hours tip — fire only when the location is closed on at least
  // one weekday (a real, actionable signal). The previous implementation
  // checked if any period was on a day other than Mon/Tue, which was true for
  // nearly every location open on weekends — so the tip always fired.
  if (location.operatingHours?.periods && location.operatingHours.periods.length > 0) {
    const periods = location.operatingHours.periods;
    const openDays = new Set(periods.map((p) => p.day));
    const allWeekdays: readonly Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const closedDays = allWeekdays.filter((d) => !openDays.has(d));

    if (closedDays.length > 0 && closedDays.length < 7) {
      const closedLabel = closedDays.length === 1
        ? `${closedDays[0]!.charAt(0).toUpperCase()}${closedDays[0]!.slice(1)}s`
        : `${closedDays.length} days a week`;
      tips.push({
        type: "timing",
        title: "Closed some days",
        message: `Closed on ${closedLabel}. Verify hours before visiting.`,
        priority: 7,
        icon: "🕐",
      });
    }
  }

  // Meal timing tips
  if (category === "restaurant" || activity.mealType) {
    const mealType = activity.mealType ?? (activity.timeOfDay === "morning" ? "breakfast" : activity.timeOfDay === "evening" ? "dinner" : "lunch");
    
    if (mealType === "breakfast" && activity.timeOfDay !== "morning") {
      tips.push({
        type: "timing",
        title: "Breakfast Timing",
        message: "Breakfast is typically served until 10-11 AM. Make sure to arrive early.",
        priority: 7,
        icon: "🍳",
      });
    } else if (mealType === "dinner" && activity.timeOfDay === "afternoon") {
      tips.push({
        type: "timing",
        title: "Dinner Timing",
        message: "Dinner service usually starts around 5-6 PM. Consider adjusting your schedule.",
        priority: 7,
        icon: "🍽️",
      });
    }
  }

  return tips;
}

const TRADITIONAL_DINING_CATEGORIES = new Set([
  "kaiseki", "ryokan", "izakaya_traditional", "traditional",
]);
const TRADITIONAL_TAGS = new Set([
  "traditional", "tatami", "kaiseki", "ryokan",
]);

/**
 * A dining venue is traditional (likely shoe removal) if either its category
 * signals it or its tags do. Keeps the signal narrow so the tip fires on the
 * small fraction of venues where it's actually useful.
 */
function isTraditionalDining(
  category: string,
  locationTags: string[] | undefined,
  activityTags: string[] | undefined,
): boolean {
  if (TRADITIONAL_DINING_CATEGORIES.has(category)) return true;
  const allTags = [...(locationTags ?? []), ...(activityTags ?? [])];
  return allTags.some((t) => TRADITIONAL_TAGS.has(t.toLowerCase()));
}

/**
 * City-specific last-train guidance. Cutoff times reflect weekday averages
 * for returning to major accommodation hubs — values simplified to round
 * times since the tip is directional ("wrap up by ~midnight"), not a
 * schedule lookup. Users who need exact last-train data should consult
 * Google Maps at the venue.
 */
const LAST_TRAIN_BY_CITY: Record<string, { cutoff: string; hub: string }> = {
  tokyo: { cutoff: "around 12:20 AM", hub: "Shinjuku" },
  osaka: { cutoff: "around 11:55 PM", hub: "Umeda" },
  kyoto: { cutoff: "around 11:30 PM", hub: "Kyoto Station" },
  nagoya: { cutoff: "around 11:50 PM", hub: "Nagoya Station" },
  fukuoka: { cutoff: "around 11:40 PM", hub: "Hakata Station" },
  sapporo: { cutoff: "around 11:50 PM", hub: "Sapporo Station" },
  yokohama: { cutoff: "around 12:15 AM", hub: "Yokohama Station" },
};

const NIGHTLIFE_CATEGORIES = new Set([
  "bar", "izakaya", "nightlife", "entertainment", "club",
]);

/**
 * Last-train tip — fires for evening nightlife activities in cities where we
 * have known cutoff data. Practical advice matters here: missing the last
 * train means a ¥5,000+ taxi or a capsule hotel.
 */
function generateLastTrainTips(
  location: Location,
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  cityId: CityId,
): ActivityTip[] {
  if (activity.timeOfDay !== "evening") return [];

  const category = location.category?.toLowerCase() ?? "";
  const isNightlife = NIGHTLIFE_CATEGORIES.has(category) ||
    location.tags?.some((t) => NIGHTLIFE_CATEGORIES.has(t.toLowerCase()));
  if (!isNightlife) return [];

  const data = LAST_TRAIN_BY_CITY[cityId.toLowerCase()];
  if (!data) return [];

  return [{
    type: "timing",
    title: "Last train",
    message: `Last trains from ${data.hub} run ${data.cutoff}. Check Google Maps from the venue before your second drink — taxis after midnight run ¥5,000+, and capsule hotels are ¥3,000-4,000 if you miss it.`,
    priority: 8,
    icon: "🌙",
  }];
}

/**
 * Holiday-aware crowd tip. Escalates when the activity date falls in a
 * significant-impact holiday (multiplier ≥ 1.5) AND the location is one we
 * already flag with a crowd-override peakWarning. The combination is rare
 * enough to deserve a loud, date-specific tip ("It's Golden Week at
 * Fushimi Inari — expect 2+ hour queues"). For non-holiday dates or
 * non-tracked locations, we defer to the regular crowd tip path.
 */
function generateHolidayAwareCrowdTips(
  location: Location,
  activityDate: Date,
): ActivityTip[] {
  const override = CROWD_OVERRIDE_MAP.get(location.id);
  if (!override) return [];

  const month = activityDate.getMonth() + 1;
  const day = activityDate.getDate();
  const year = activityDate.getFullYear();
  const holidays = getActiveHolidays(month, day, month, day, year);
  const significant = holidays.find((h) => h.crowdMultiplier >= 1.5);
  if (!significant) return [];

  return [{
    type: "crowd",
    title: `${significant.name} at ${override.name}`,
    message: `${significant.name} typically multiplies crowds at popular sites by ${significant.crowdMultiplier}x. ${override.peakWarning ?? "Expect long queues and limited access."} Arrive at opening or consider swapping to a quieter day.`,
    priority: 10,
    icon: "⚠️",
    isImportant: true,
  }];
}

/**
 * Generate accessibility tips
 */
function generateAccessibilityTips(location: Location): ActivityTip[] {
  const tips: ActivityTip[] = [];

  if (location.accessibility) {
    if (location.accessibility.wheelchairAccessible) {
      tips.push({
        type: "accessibility",
        title: "Wheelchair Accessible",
        message: "This location is wheelchair accessible. Wheelchair users can enjoy full access.",
        priority: 5,
        icon: "♿",
      });
    } else {
      tips.push({
        type: "accessibility",
        title: "Accessibility Note",
        message: "This location may have limited wheelchair access. Contact ahead if you have specific accessibility needs.",
        priority: 6,
        icon: "♿",
      });
    }

    if (location.accessibility.stepFreeAccess) {
      tips.push({
        type: "accessibility",
        title: "Step-Free Access",
        message: "Step-free access is available, making it easier for those with mobility concerns.",
        priority: 5,
        icon: "🚶",
      });
    }
  }

  return tips;
}

/**
 * Generate budget tips
 */
function generateBudgetTips(location: Location): ActivityTip[] {
  const tips: ActivityTip[] = [];

  if (location.minBudget) {
    const budget = location.minBudget.toLowerCase();
    
    if (budget.includes("luxury") || budget.includes("expensive")) {
      tips.push({
        type: "budget",
        title: "Premium Experience",
        message: "This is a premium location. Budget accordingly and consider making reservations in advance.",
        priority: 6,
        icon: "💰",
      });
    } else if (budget.includes("budget") || budget.includes("free")) {
      tips.push({
        type: "budget",
        title: "Budget-Friendly",
        message: "Great value! This location offers an excellent experience without breaking the bank.",
        priority: 4,
        icon: "💵",
      });
    }
  }

  return tips;
}

/**
 * Generate general tips
 */
function generateGeneralTips(
  location: Location,
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): ActivityTip[] {
  const tips: ActivityTip[] = [];
  const category = location.category?.toLowerCase() ?? "";

  // Duration tips
  if (activity.durationMin) {
    if (activity.durationMin < 60) {
      tips.push({
        type: "general",
        title: "Quick stop",
        message: "A short visit. Good time to grab a vending machine drink or pick up a stamp if they have one.",
        priority: 3,
        icon: "⏱️",
      });
    } else if (activity.durationMin > 180) {
      tips.push({
        type: "general",
        title: "Half-day visit",
        message: "You'll be here a while. Pace yourself, find a bench, and don't rush. Many places have a rest area or tea shop inside.",
        priority: 4,
        icon: "⏰",
      });
    }
  }

  // Category-specific tips
  if (category === "shrine" || category === "temple") {
    tips.push({
      type: "general",
      title: "Temple and shrine etiquette",
      message: "Remove shoes before entering temple buildings (look for shelves or plastic bags at the entrance). Speak quietly, silence your phone, and follow posted guidelines.",
      priority: 7,
      icon: "🙏",
    });
  } else if (category === "onsen" || category === "wellness") {
    tips.push({
      type: "general",
      title: "Shoes off",
      message: "Remove shoes at the entrance and use the provided slippers or go in socks. This applies to most onsen, ryokan, and traditional wellness facilities.",
      priority: 7,
      icon: "👟",
    });
  } else if (isTraditionalDining(category, location.tags, activity.tags)) {
    // Only fire for dining venues where tatami seating is genuinely likely.
    // The previous blanket "restaurant || cafe" trigger fired on nearly every
    // meal and trained users to ignore tips.
    tips.push({
      type: "general",
      title: "Shoe removal likely",
      message: "Traditional dining venues often have tatami seating. Look for a raised genkan or shoe shelves at the entrance and slip off your shoes before stepping up.",
      priority: 6,
      icon: "👟",
    });
  } else if (category === "market") {
    tips.push({
      type: "general",
      title: "Market tips",
      message: "Go early for the freshest selection. Bring cash (most stalls are cash-only). Eat at the stall, not while walking. Ask before taking photos of food displays.",
      priority: 6,
      icon: "🛒",
    });
  }

  return tips;
}

/**
 * Generate travel tips based on the travel segment
 */
function generateTravelTips(
  activity: Extract<ItineraryActivity, { kind: "place" }>,
  allActivities?: ItineraryActivity[],
): ActivityTip[] {
  const tips: ActivityTip[] = [];

  // Check travel from previous
  const travelSegment = activity.travelFromPrevious;
  if (travelSegment && travelSegment.durationMinutes > 0) {
    const durationMinutes = travelSegment.durationMinutes;
    const mode = travelSegment.mode;

    // Long travel time tip
    if (durationMinutes >= 30) {
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const timeLabel = hours > 0
        ? `${hours}h ${mins > 0 ? `${mins}m` : ""}`
        : `${mins} min`;

      // Find the previous activity name
      let previousActivityName = "previous location";
      if (allActivities) {
        const activityIndex = allActivities.findIndex((a) => a.id === activity.id);
        if (activityIndex > 0) {
          const prev = allActivities[activityIndex - 1];
          if (prev && prev.kind === "place") {
            previousActivityName = prev.title;
          }
        }
      }

      if (mode === "train" || mode === "subway" || mode === "transit") {
        tips.push({
          type: "travel",
          title: `${timeLabel} by train`,
          message: `From ${previousActivityName}.`,
          priority: 8,
          icon: "🚃",
          isImportant: durationMinutes >= 45,
        });
      } else if (mode === "walk") {
        tips.push({
          type: "travel",
          title: `${timeLabel} walk`,
          message: `Good walking shoes recommended. ${durationMinutes >= 30 ? "Consider taking transit if you prefer." : ""}`,
          priority: 7,
          icon: "🚶",
        });
      } else if (mode === "bus") {
        tips.push({
          type: "travel",
          title: `${timeLabel} by bus`,
          message: `Check bus schedules in advance.`,
          priority: 7,
          icon: "🚌",
        });
      }
    }

    // Transfer tip — only for transit modes, count actual transit legs
    // Google Directions transit steps include "Line <name>" in the instruction;
    // walking steps and Mapbox driving maneuvers don't match this pattern.
    const TRANSIT_MODES = new Set(["train", "subway", "bus", "tram", "ferry", "transit"]);
    if (
      TRANSIT_MODES.has(mode) &&
      travelSegment.instructions &&
      travelSegment.instructions.length >= 2
    ) {
      const transitLegs = travelSegment.instructions.filter(
        (inst) => /\bLine\b/.test(inst),
      ).length;
      const transferCount = transitLegs - 1;

      if (transferCount > 0) {
        tips.push({
          type: "travel",
          title: `${transferCount} transfer${transferCount > 1 ? "s" : ""}`,
          message: "Allow extra time for transfers. Follow station signage carefully.",
          priority: 7,
          icon: "🔄",
        });
      }
    }
  }

  return tips;
}

/**
 * Generate payment tips
 */
function generatePaymentTips(
  location: Location,
  _activity: Extract<ItineraryActivity, { kind: "place" }>,
): ActivityTip[] {
  const tips: ActivityTip[] = [];
  const category = location.category?.toLowerCase() ?? "";

  // Cash-only common categories
  const cashOnlyCategories = ["market", "street_food", "ramen", "izakaya", "shrine", "temple"];
  const isCashOnlyCategory = cashOnlyCategories.some((cat) => category.includes(cat));

  // Category-based fallback: used when `paymentTypes` is unset on a location.
  // Once editorial seeding covers more venues, prefer derivePaymentPill(location).
  if (isCashOnlyCategory) {
    // Infer cash-only from category
    tips.push({
      type: "payment",
      title: "Cash Recommended",
      message: "Many traditional shops and street vendors prefer cash. Convenience store ATMs are widely available.",
      priority: 6,
      icon: "💵",
    });
  }

  // Temple/shrine donation tip
  if (category === "shrine" || category === "temple") {
    tips.push({
      type: "payment",
      title: "Small Change",
      message: "Bring coins (especially 5 yen coins for shrines) for offerings and fortune papers (omikuji).",
      priority: 5,
      icon: "🪙",
    });
  }

  return tips;
}

/**
 * Generate reservation tips
 */
function generateReservationTips(
  location: Location,
  activity: Extract<ItineraryActivity, { kind: "place" }>,
): ActivityTip[] {
  const tips: ActivityTip[] = [];
  const category = location.category?.toLowerCase() ?? "";
  const rating = location.rating ?? 0;

  // Tier 1: top-rated kaiseki/omakase/sushi venues — realistic lead time is
  // 1-3 months. Saying "a few days" sets the wrong expectation for travelers
  // who would otherwise not bother calling ahead.
  const TIER1_CATEGORIES = ["kaiseki", "omakase"];
  const isTier1 = TIER1_CATEGORIES.some((cat) => category.includes(cat)) ||
    (category.includes("sushi") && rating >= 4.7);

  // Tier 2: fine dining and other high-end categories where 2-4 weeks is
  // usually enough.
  const TIER2_CATEGORIES = ["fine_dining", "sushi"];
  const isTier2 = TIER2_CATEGORIES.some((cat) => category.includes(cat));

  // Tier 3: merely popular restaurant — a few days ahead is fine.
  const isTier3 = rating >= 4.7 && (category === "restaurant" || activity.mealType === "dinner");

  if (isTier1) {
    tips.push({
      type: "reservation",
      title: "Reservation required",
      message: "Top kaiseki and omakase venues typically book out 1-3 months ahead. If you're set on this one, call or email as soon as your dates are fixed — waitlist spots do open up.",
      priority: 9,
      icon: "📞",
      isImportant: true,
    });
  } else if (isTier2) {
    tips.push({
      type: "reservation",
      title: "Reservation recommended",
      message: "For fine dining, 2-4 weeks ahead is usually enough. Concierge desks and OMAKASE.in can help if the restaurant's site is Japanese-only.",
      priority: 9,
      icon: "📞",
      isImportant: true,
    });
  } else if (isTier3) {
    tips.push({
      type: "reservation",
      title: "Reservation recommended",
      message: "Popular with locals and travelers. A few days ahead is usually enough; walk-ins sometimes work on weekdays before 6 PM.",
      priority: 9,
      icon: "📞",
      isImportant: true,
    });
  }

  // Popular attractions
  if (rating >= 4.5 && (category === "museum" || category === "attraction")) {
    tips.push({
      type: "reservation",
      title: "Consider Advance Tickets",
      message: "This popular attraction may have lines. Online tickets can save time.",
      priority: 7,
      icon: "🎟️",
    });
  }

  return tips;
}

