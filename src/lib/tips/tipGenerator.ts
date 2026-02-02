import type { Location } from "@/types/location";
import type { ItineraryActivity } from "@/types/itinerary";
import type { WeatherForecast } from "@/types/weather";
import { fetchGuidanceForLocation } from "./guidanceService";
import type { TravelGuidance } from "@/types/travelGuidance";

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

  // Accessibility tips
  const accessibilityTips = generateAccessibilityTips(location);
  tips.push(...accessibilityTips);

  // Budget tips
  const budgetTips = generateBudgetTips(location);
  tips.push(...budgetTips);

  // General tips
  const generalTips = generateGeneralTips(location, activity);
  tips.push(...generalTips);

  // Sort by priority (highest first), with important tips getting a boost
  // Return top 3 tips
  return tips
    .sort((a, b) => {
      const aScore = a.priority + (a.isImportant ? 5 : 0);
      const bScore = b.priority + (b.isImportant ? 5 : 0);
      return bScore - aScore;
    })
    .slice(0, 3);
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
  },
): Promise<ActivityTip[]> {
  // Get the base tips synchronously
  const tips = generateActivityTips(activity, location, options);

  // Fetch etiquette tips from database
  try {
    const guidanceTips = await fetchGuidanceForLocation(location, options?.activityDate);
    const etiquetteTips = guidanceTips.map(guidanceToActivityTip);
    tips.push(...etiquetteTips);
  } catch {
    // Silently fail - we still have the base tips
  }

  // Re-sort and limit to top 3
  return tips
    .sort((a, b) => {
      const aScore = a.priority + (a.isImportant ? 5 : 0);
      const bScore = b.priority + (b.isImportant ? 5 : 0);
      return bScore - aScore;
    })
    .slice(0, 3);
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

  // High-rated locations are more popular
  if (location.rating && location.rating >= 4.5) {
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
    const isIndoor = ["museum", "shopping", "restaurant", "bar"].includes(category);
    
    if (isIndoor) {
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
        title: "Rain Expected",
        message: "Rain is forecasted. Bring an umbrella or consider rescheduling if possible. Some outdoor areas may be slippery.",
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
        title: "Cold Weather",
        message: "It will be chilly today. Dress warmly, especially if visiting outdoor areas.",
        priority: 7,
        icon: "🧥",
      });
    } else if (avgTemp > 30) {
      tips.push({
        type: "weather",
        title: "Hot Weather",
        message: "It will be hot today. Stay hydrated and seek shade when possible.",
        priority: 7,
        icon: "🌡️",
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

  // Operating hours tips
  if (location.operatingHours?.periods && location.operatingHours.periods.length > 0) {
    const periods = location.operatingHours.periods;
    
    // Check if it's a weekday-specific location
    const hasWeekdayRestrictions = periods.some((p) => p.day !== "monday" && p.day !== "tuesday");
    
    if (hasWeekdayRestrictions) {
      tips.push({
        type: "timing",
        title: "Check Operating Hours",
        message: "This location may have specific operating hours. Verify before visiting to avoid disappointment.",
        priority: 6,
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
        title: "Quick Visit",
        message: "This is a quick stop. Perfect for fitting into a busy schedule.",
        priority: 3,
        icon: "⏱️",
      });
    } else if (activity.durationMin > 180) {
      tips.push({
        type: "general",
        title: "Extended Visit",
        message: "Plan for a longer stay here. There's plenty to explore and experience.",
        priority: 4,
        icon: "⏰",
      });
    }
  }

  // Category-specific tips
  if (category === "shrine" || category === "temple") {
    tips.push({
      type: "general",
      title: "Cultural Etiquette",
      message: "Remember to be respectful: remove shoes if required, avoid loud conversations, and follow any posted guidelines.",
      priority: 7,
      icon: "🙏",
    });
  } else if (category === "market") {
    tips.push({
      type: "general",
      title: "Market Tips",
      message: "Markets are best visited in the morning for freshest produce. Bring cash as some vendors may not accept cards.",
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
          message: `From ${previousActivityName}. Consider getting an IC card for convenient payment.`,
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
          message: `Check bus schedules in advance. IC cards work on most city buses.`,
          priority: 7,
          icon: "🚌",
        });
      }
    }

    // Transfer tip for complex transit
    if (travelSegment.instructions && travelSegment.instructions.length >= 2) {
      const transferCount = travelSegment.instructions.length - 1;
      tips.push({
        type: "travel",
        title: `${transferCount} transfer${transferCount > 1 ? "s" : ""}`,
        message: "Allow extra time for transfers. Follow station signage carefully.",
        priority: 7,
        icon: "🔄",
      });
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

  // Infer cash preference from category (paymentTypes not yet in Location schema)
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

  // High-end restaurants
  const reservationCategories = ["fine_dining", "kaiseki", "omakase", "sushi"];
  const needsReservation = reservationCategories.some((cat) => category.includes(cat));

  if (needsReservation || (location.rating && location.rating >= 4.7 && (category === "restaurant" || activity.mealType === "dinner"))) {
    tips.push({
      type: "reservation",
      title: "Reservation Recommended",
      message: "Popular with tourists and locals alike. Book several days in advance if possible.",
      priority: 9,
      icon: "📞",
      isImportant: true,
    });
  }

  // Popular attractions
  if (location.rating && location.rating >= 4.5 && (category === "museum" || category === "attraction")) {
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

