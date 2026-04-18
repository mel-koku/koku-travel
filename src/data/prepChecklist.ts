import type { StoredTrip } from "@/services/trip/types";

export type PrepSection =
  | "if_you_havent_already"
  | "a_week_before"
  | "last_few_days"
  | "japan_context"
  | "if_your_trip_has";

export type PrepItem = {
  id: string;
  section: PrepSection;
  title: string;
  body: string;
  icon: string;
  condition?: (trip: StoredTrip) => boolean;
};

// --- Conditional helpers ---

const TRANSIT_MODES = new Set(["train", "subway", "bus", "tram", "ferry", "transit"]);

function countTransitLegs(trip: StoredTrip): number {
  const days = (trip.itinerary?.days ?? []) as Array<{
    activities: Array<{ kind?: string; travelFromPrevious?: { mode?: string } }>;
  }>;
  return days.reduce(
    (count, d) =>
      count +
      d.activities.filter(
        (a) =>
          a.kind === "place" &&
          a.travelFromPrevious &&
          typeof a.travelFromPrevious.mode === "string" &&
          TRANSIT_MODES.has(a.travelFromPrevious.mode),
      ).length,
    0,
  );
}

function tripOverlapsAugToMidOct(trip: StoredTrip): boolean {
  const start = trip.builderData?.dates?.start;
  const end = trip.builderData?.dates?.end;
  if (!start || !end) return false;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return false;

  // Iterate day by day. Fine because trip lengths are bounded (<= 30).
  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const m = cursor.getMonth() + 1;
    const d = cursor.getDate();
    const afterAug15 = m > 8 || (m === 8 && d >= 15);
    const beforeOct15 = m < 10 || (m === 10 && d <= 15);
    if (afterAug15 && beforeOct15) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

function tripHasOnsenActivity(trip: StoredTrip): boolean {
  const days = (trip.itinerary?.days ?? []) as Array<{
    activities: Array<{ kind?: string; category?: string; tags?: string[] }>;
  }>;
  return days.some((d) =>
    d.activities.some((a) => {
      if (a.kind !== "place") return false;
      if (a.category === "onsen" || a.category === "wellness") return true;
      return Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase() === "onsen");
    }),
  );
}

// --- Items ---

export const PREP_CHECKLIST: readonly PrepItem[] = [
  // If you haven't already (4)
  {
    id: "passport-validity",
    section: "if_you_havent_already",
    title: "Check passport validity",
    body: "Japan requires 6+ months remaining and at least one blank page. Renewals take 6+ weeks, so check today.",
    icon: "📘",
  },
  {
    id: "travel-insurance",
    section: "if_you_havent_already",
    title: "Travel insurance",
    body: "Japan has no reciprocal health agreements, and medical evacuation after an earthquake or typhoon can run tens of thousands of USD. JNTO strongly recommends coverage for every traveler.",
    icon: "🛡️",
  },
  {
    id: "fx-fee-review",
    section: "if_you_havent_already",
    title: "Credit card FX-fee review",
    body: "Pull up your cards and check which ones have no foreign transaction fee. A 3% fee on a ¥200,000 trip is ¥6,000 gone, a great kaiseki lunch.",
    icon: "💳",
  },
  {
    id: "unlock-foreign-block",
    section: "if_you_havent_already",
    title: "Unlock foreign transactions",
    body: "Most US/UK banks auto-block foreign charges as fraud protection. Call or notify in-app before you fly so your first Tokyo dinner doesn't decline at the counter.",
    icon: "🔓",
  },

  // A week before (3)
  {
    id: "decide-internet",
    section: "a_week_before",
    title: "Decide: eSIM or pocket WiFi",
    body: "eSIM (Airalo, Ubigi, Saily) is cheapest and works on most 2018+ phones. Pocket WiFi (Japan Wireless, Ninja WiFi) is better for groups, older phones, or anyone who prefers a physical device.",
    icon: "📶",
  },
  {
    id: "visit-japan-web",
    section: "a_week_before",
    title: "Visit Japan Web pre-registration",
    body: "Fill in at vjw.digital.go.jp to skip the paper customs/immigration forms on arrival. Kiosks at Narita and Haneda handle everything in one pass if you've pre-registered.",
    icon: "📝",
  },
  {
    id: "mobile-suica",
    section: "a_week_before",
    title: "Set up Mobile Suica in Apple/Google Wallet",
    body: "Works on trains, buses, and konbini. Suica accepts any card for top-up; PASMO and ICOCA can reject non-Japanese Visa. If your phone doesn't support it, buy a Welcome Suica at an airport vending machine on arrival.",
    icon: "📱",
  },

  // Last few days (5)
  {
    id: "install-internet",
    section: "last_few_days",
    title: "Install your internet",
    body: "If you chose eSIM, install the profile now on home WiFi (airport WiFi works in a pinch but is fussier). If you chose pocket WiFi, confirm your pickup reservation.",
    icon: "🔌",
  },
  {
    id: "maps-offline",
    section: "last_few_days",
    title: "Google Maps offline for your cities",
    body: "Transit directions won't work offline in Japan even after download, but walking directions and landmarks will. Useful when you're lost in a shrine complex with no signal.",
    icon: "🗺️",
  },
  {
    id: "translate-offline",
    section: "last_few_days",
    title: "Google Translate offline Japanese pack",
    body: "Camera mode translates menus in real time. Download the pack before you fly so it works without data.",
    icon: "🈶",
  },
  {
    id: "safety-tips-app",
    section: "last_few_days",
    title: "Install the Safety Tips app",
    body: "JNTO's official earthquake, tsunami, and severe-weather alert app. Free, 15+ languages, actively maintained. Install now, enable notifications on arrival.",
    icon: "⚠️",
  },
  {
    id: "yen-cash-plan",
    section: "last_few_days",
    title: "Yen cash plan",
    body: "You don't need to pre-order from your home bank. 7-Eleven and Japan Post ATMs accept foreign cards with low fees. Pair with a no-FX-fee travel card (Wise, Revolut) for the best overall rate.",
    icon: "💴",
  },

  // Japan context (3)
  {
    id: "plug-adapter",
    section: "japan_context",
    title: "Plug adapter",
    body: "Japan uses Type A (two flat prongs, identical to US/Canada). UK, EU, and Australian travelers need a physical adapter. Modern phone and laptop chargers are dual-voltage, so no converter needed, just the shape.",
    icon: "🔌",
  },
  {
    id: "towel-and-bag",
    section: "japan_context",
    title: "Pack a hand towel and a small trash bag",
    body: "Public restrooms often lack paper towels, and street trash bins are genuinely rare. A small towel and a folded plastic bag solve both.",
    icon: "👜",
  },
  {
    id: "no-tipping",
    section: "japan_context",
    title: "No tipping, anywhere",
    body: "Tipping is not practiced in Japan and can confuse staff. Service charges, when they exist, are already on the bill. Say 'gochisousama deshita' when you leave instead, it's how you thank the kitchen.",
    icon: "🙏",
  },

  // If your trip has... (4 conditional)
  {
    id: "jr-pass-decision",
    section: "if_your_trip_has",
    title: "JR Pass vs individual tickets",
    body: "After the Oct 2023 and Oct 2026 price hikes, the nationwide JR Pass only pencils out for very train-heavy trips. Compare on Japan Guide's calculator; regional passes (JR East, Kansai-Hiroshima) often beat the nationwide version.",
    icon: "🚄",
    condition: (trip) => countTransitLegs(trip) >= 3,
  },
  {
    id: "typhoon-buffer",
    section: "if_your_trip_has",
    title: "Typhoon-season buffer",
    body: "Peak typhoon months can disrupt Shinkansen and flights with little notice. Keep your first and last day light, and buy refundable accommodations where you can.",
    icon: "🌀",
    condition: tripOverlapsAugToMidOct,
  },
  {
    id: "onsen-tattoos",
    section: "if_your_trip_has",
    title: "Tattoo policies vary at onsen",
    body: "Many traditional onsen prohibit visible tattoos; some provide cover-up stickers, some offer private baths (kashikiri-buro) as an alternative. Check the venue's policy before you go, or look for 'tattoo-friendly' listings.",
    icon: "♨️",
    condition: tripHasOnsenActivity,
  },
  {
    id: "takkyubin",
    section: "if_your_trip_has",
    title: "Takkyubin luggage forwarding",
    body: "Yamato Transport will forward your main suitcase hotel-to-hotel overnight for around ¥2,000. Airport counters have English forms. Changes the packing game entirely if you're moving a lot.",
    icon: "🧳",
    condition: (trip) =>
      (trip.builderData?.cities?.length ?? 0) >= 3 &&
      (trip.builderData?.duration ?? 0) >= 7,
  },
];

const PREP_ITEM_ID_SET = new Set(PREP_CHECKLIST.map((i) => i.id));

/** Type guard used by the API route to reject unknown itemIds. */
export function isPrepItemId(value: string): boolean {
  return PREP_ITEM_ID_SET.has(value);
}

/**
 * Compute done/total for a trip, excluding conditional items that don't
 * apply. Orphaned keys in prepState (items removed from code) are ignored.
 */
export function countPrepProgress(trip: StoredTrip): { done: number; total: number } {
  const applicable = PREP_CHECKLIST.filter((item) =>
    item.condition ? item.condition(trip) : true,
  );
  const state = trip.prepState ?? {};
  const done = applicable.filter((item) => state[item.id] === true).length;
  return { done, total: applicable.length };
}
