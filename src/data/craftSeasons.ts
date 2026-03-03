import type { CraftTypeId } from "./craftTypes";

export type CraftSeasonalHighlight = {
  craftType: CraftTypeId;
  months: number[];
  title: string;
  description: string;
};

export const CRAFT_SEASONAL_HIGHLIGHTS: CraftSeasonalHighlight[] = [
  {
    craftType: "pottery",
    months: [10, 11],
    title: "Autumn Pottery Festivals",
    description:
      "Fall pottery fairs across Mashiko, Seto, and Arita — open studios, kiln tours, and discounted wares.",
  },
  {
    craftType: "dyeing",
    months: [4, 5, 6],
    title: "Spring Indigo Season",
    description:
      "Fresh indigo leaves are harvested in spring. The best time to try hand-dyeing with natural aizome.",
  },
  {
    craftType: "textile",
    months: [1, 2, 3],
    title: "Winter Weaving Season",
    description:
      "Cold months are peak weaving time in snow country — Nishijin looms run at full pace for spring kimono.",
  },
  {
    craftType: "papermaking",
    months: [12, 1, 2],
    title: "Washi in Winter",
    description:
      "Cold, clean water produces the strongest washi fibers. Many papermaking workshops run winter-only programs.",
  },
  {
    craftType: "lacquerware",
    months: [6, 7, 8],
    title: "Urushi Harvest Season",
    description:
      "Summer humidity is ideal for lacquer curing. Wajima and Aizu workshops offer seasonal tapping demonstrations.",
  },
  {
    craftType: "glasswork",
    months: [7, 8],
    title: "Summer Glass Festivals",
    description:
      "Edo kiriko and blown glass workshops host summer events — cooler indoor studios make a refreshing escape.",
  },
  {
    craftType: "metalwork",
    months: [3, 4],
    title: "Spring Forging Season",
    description:
      "Seki and Tsubame-Sanjo open their forges for spring — knife-making workshops and smithy tours peak in early spring.",
  },
  {
    craftType: "kintsugi",
    months: [1, 2, 3, 4],
    title: "New Year Kintsugi Revival",
    description:
      "Start the year by mending — many studios offer beginner kintsugi workshops tied to the Japanese New Year spirit of renewal.",
  },
];

/**
 * Returns seasonal highlights active for the given month (1-12).
 */
export function getActiveCraftHighlights(
  month: number
): CraftSeasonalHighlight[] {
  return CRAFT_SEASONAL_HIGHLIGHTS.filter((h) => h.months.includes(month));
}
