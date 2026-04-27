import type { ItineraryActivity } from "@/types/itinerary";

type KonbiniMealType = "breakfast" | "lunch" | "dinner";

const KONBINI_INFO: Record<KonbiniMealType, { title: string; tips: string }> = {
  breakfast: {
    title: "Konbini Breakfast",
    tips: "Try onigiri (rice balls), tamago sando (egg sandwich), or hot canned coffee. 7-Eleven, Lawson, and FamilyMart are everywhere and open 24/7.",
  },
  lunch: {
    title: "Konbini Lunch",
    tips: "Bento boxes, yakisoba, udon cups, or seasonal limited items. Most konbinis have a microwave and hot water. Don't miss the premium onigiri!",
  },
  dinner: {
    title: "Konbini Dinner",
    tips: "Hot nikuman (meat buns), oden in winter, or fresh bento. Perfect for a quick meal at your hotel after a long day of sightseeing.",
  },
};

function generateActivityId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `activity_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createKonbiniActivity(
  mealType: KonbiniMealType,
  timeSlot: "morning" | "afternoon" | "evening",
): ItineraryActivity {
  const info = KONBINI_INFO[mealType];
  return {
    kind: "note",
    id: generateActivityId(),
    title: "Note",
    timeOfDay: timeSlot,
    notes: `**${info.title}**\n\n${info.tips}`,
  };
}

export const TIME_SLOT_BY_MEAL: Record<KonbiniMealType, "morning" | "afternoon" | "evening"> = {
  breakfast: "morning",
  lunch: "afternoon",
  dinner: "evening",
};
