import type { Itinerary } from "@/types/itinerary";
import { getActiveHolidays } from "@/data/crowdPatterns";
import { getSeasonalFoods, formatSeasonalFoodTip } from "@/data/seasonalFoods";
import { parseLocalDate } from "@/lib/utils/dateUtils";

export type TripLevelTip = {
  id: string;
  title: string;
  summary: string;
  icon: string;
};

/**
 * Generate tips that apply to the entire trip and should only be shown once
 * in the "Travel Essentials" section, not repeated per-day.
 */
export function getTripLevelTips(
  itinerary: Itinerary,
  tripStartDate?: string,
): TripLevelTip[] {
  const tips: TripLevelTip[] = [];
  const days = itinerary.days;
  if (days.length === 0) return tips;

  // Count transit legs, not any-transit. One-leg trips (e.g., a single bus
  // ride in a walking-heavy Tokyo itinerary) don't justify the IC card tip
  // at the top of Travel Essentials — it becomes noise. Require at least 3
  // legs to signal that getting an IC card is actually worthwhile.
  const TRANSIT_MODES = new Set(["train", "subway", "bus", "tram", "ferry", "transit"]);
  const transitLegCount = days.reduce(
    (count, d) =>
      count +
      d.activities.filter(
        (a) =>
          a.kind === "place" &&
          a.travelFromPrevious &&
          TRANSIT_MODES.has(a.travelFromPrevious.mode),
      ).length,
    0,
  );
  const hasMeaningfulTransit = transitLegCount >= 3;
  const hasAnyTransit = transitLegCount > 0;
  const hasTemplesOrShrines = days.some((d) =>
    d.activities.some((a) =>
      a.kind === "place" &&
      a.tags?.some((t) => ["temple", "shrine"].includes(t)),
    ),
  );

  // IC Card — only once the traveler will use transit enough to justify it.
  if (hasMeaningfulTransit) {
    tips.push({
      id: "trip-ic-card",
      title: "Get an IC Card",
      summary:
        "Get an IC card (Suica, PASMO, ICOCA, or any regional card) at any station. They all work nationwide on trains, buses, and convenience stores.",
      icon: "train-front",
    });
  }

  // Escalator etiquette — relevant any time the traveler is in a station.
  if (hasAnyTransit) {
    tips.push({
      id: "trip-escalator",
      title: "Escalator etiquette",
      summary:
        "Stand on the left in Tokyo (right in Osaka/Kyoto). Keep the other side clear for people walking past.",
      icon: "footprints",
    });
  }

  // Goshuin etiquette
  if (hasTemplesOrShrines) {
    tips.push({
      id: "trip-goshuin",
      title: "Goshuin etiquette",
      summary:
        "Many temples and shrines offer goshuin (\u5FA1\u6731\u5370), hand-brushed calligraphy stamps. Bring a goshuincho (stamp book) and present it open to the correct page. Typical cost: \u00A5300-500.",
      icon: "book-open",
    });
  }

  // Holiday awareness
  if (tripStartDate) {
    const startDate = parseLocalDate(tripStartDate);
    if (startDate) {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days.length - 1);
      const holidays = getActiveHolidays(
        startDate.getMonth() + 1,
        startDate.getDate(),
        endDate.getMonth() + 1,
        endDate.getDate(),
        startDate.getFullYear(),
      );
      for (const holiday of holidays) {
        tips.push({
          id: `trip-holiday-${holiday.id}`,
          title: holiday.name,
          summary: `${holiday.description} Expect larger crowds at popular destinations during this period.`,
          icon: "alert-triangle",
        });
      }
    }
  }

  // Seasonal food overview
  if (tripStartDate) {
    const startDate = parseLocalDate(tripStartDate);
    if (startDate) {
      const month = startDate.getMonth() + 1;
      const allCities = [...new Set(days.map((d) => d.cityId).filter(Boolean))];
      const allFoods = allCities.flatMap((c) => getSeasonalFoods(month, c!));
      const uniqueFoods = [
        ...new Map(allFoods.map((f) => [f.name, f])).values(),
      ];
      if (uniqueFoods.length > 0) {
        tips.push({
          id: "trip-seasonal-food",
          title: "What's in season",
          summary: formatSeasonalFoodTip(uniqueFoods.slice(0, 6)),
          icon: "utensils",
        });
      }
    }
  }

  // Cash-only locations
  const cashOnlyActivities = days.flatMap((d) =>
    d.activities.filter(
      (a) => a.kind === "place" && a.tags?.includes("cash-only"),
    ),
  );
  if (cashOnlyActivities.length > 0) {
    const names = [...new Set(cashOnlyActivities.map((a) => a.title))].slice(
      0,
      4,
    );
    tips.push({
      id: "trip-cash-only",
      title: "Bring cash",
      summary: `${names.join(", ")}${cashOnlyActivities.length > 4 ? ` and ${cashOnlyActivities.length - 4} more` : ""} ${cashOnlyActivities.length === 1 ? "is" : "are"} cash-only. Withdraw yen at any 7-Eleven or post office ATM.`,
      icon: "japanese-yen",
    });
  }

  // Money in Japan — always fires. The three decisions every traveler faces:
  // where to change money, which cards work, and the DCC gotcha.
  tips.push({
    id: "trip-money",
    title: "Money in Japan",
    summary:
      "Skip the city exchange booths. 7-Eleven and Japan Post ATMs accept foreign cards and use the mid-market rate, usually better than any cash exchange. Airport counters are fine if you want some yen on arrival. Visa and Mastercard are widely accepted in cities (less so rural); Amex is spotty outside department stores. If a card terminal offers to charge in your home currency, always say JPY — \"pay in yen\" avoids a 3-5% dynamic conversion fee. And no tipping, anywhere.",
    icon: "japanese-yen",
  });

  return tips;
}
