import type { TripOverviewTemplate } from "@/types/itineraryGuide";

/**
 * Trip overview templates shown at the top of the itinerary.
 * Matched by key: "cityCombination:season"
 *
 * Key dimensions:
 *   cities: alphabetically sorted, joined with "+" (e.g. "kyoto+osaka")
 *   season: spring, summer, fall, winter, any
 *
 * "generic" acts as a city-level fallback.
 */
export const TRIP_OVERVIEW_TEMPLATES: TripOverviewTemplate[] = [
  // ─── kyoto + osaka ──────────────────────────────────────────────────
  {
    id: "to-1",
    key: "kyoto+osaka:spring",
    content:
      "You've picked the golden combo — Kyoto's ancient beauty meets Osaka's electric energy, and you're doing it during cherry blossom season. Expect serene temple gardens draped in pink alongside bustling food alleys. This is Japan at its most magical.",
    icon: "🌸",
  },
  {
    id: "to-2",
    key: "kyoto+osaka:fall",
    content:
      "Kyoto in autumn is a painter's dream, and pairing it with Osaka means you get fiery red maples by day and sizzling street food by night. Two cities, two completely different vibes, one incredible trip.",
    icon: "🍁",
  },
  {
    id: "to-3",
    key: "kyoto+osaka:any",
    content:
      "Tradition and energy, side by side. Kyoto's temples and tea houses balance perfectly against Osaka's neon-lit food scene. These two cities are only 15 minutes apart by train but feel like different worlds — and that's exactly the point.",
    icon: "✨",
  },

  // ─── kyoto + nara ──────────────────────────────────────────────────
  {
    id: "to-4",
    key: "kyoto+nara:spring",
    content:
      "Kyoto and Nara in spring is about as serene as Japan gets. Cherry blossoms over ancient temples, friendly deer in sprawling parks, and a pace of life that lets you actually breathe it all in. Bring a camera — you'll need it.",
    icon: "🌸",
  },
  {
    id: "to-5",
    key: "kyoto+nara:any",
    content:
      "Two of Japan's most ancient capitals, one trip. Kyoto dazzles with refined elegance while Nara charms with its laid-back atmosphere and famously bold deer. Together, they tell the story of Japan's cultural heart.",
    icon: "🦌",
  },

  // ─── kyoto + nara + osaka ──────────────────────────────────────────
  {
    id: "to-6",
    key: "kyoto+nara+osaka:spring",
    content:
      "The Kansai triple crown during cherry blossom season — you really went all in. Kyoto's temples in pink, Nara's deer parks in bloom, and Osaka's food streets buzzing with spring energy. This is the trip people dream about.",
    icon: "🌸",
  },
  {
    id: "to-7",
    key: "kyoto+nara+osaka:fall",
    content:
      "Autumn across the Kansai region is something special. Kyoto's maple-lined paths, Nara's golden park canopy, and Osaka's cozy street food scene all come together into one unforgettable journey through fall colors and flavors.",
    icon: "🍁",
  },
  {
    id: "to-8",
    key: "kyoto+nara+osaka:any",
    content:
      "You've got the full Kansai experience ahead — ancient temples, roaming deer, and the best street food in Japan. Kyoto, Nara, and Osaka each bring something completely different, and together they make the perfect trip.",
    icon: "⛩️",
  },

  // ─── osaka + tokyo ─────────────────────────────────────────────────
  {
    id: "to-9",
    key: "osaka+tokyo:spring",
    content:
      "Japan's two biggest personalities, connected by bullet train and united by cherry blossoms. Tokyo's skyscraper-framed sakura and Osaka's riverside blooms each have their own magic. Add world-class food in both cities and you've got a trip that delivers on every level.",
    icon: "🚄",
  },
  {
    id: "to-10",
    key: "osaka+tokyo:fall",
    content:
      "East meets west — Tokyo's cutting-edge cool alongside Osaka's warm, unfiltered energy, all wrapped in autumn colors. The shinkansen ride between them is an experience in itself. Two cities, double the adventure.",
    icon: "🍁",
  },
  {
    id: "to-11",
    key: "osaka+tokyo:any",
    content:
      "The tale of two cities. Tokyo is polished, futuristic, endlessly surprising. Osaka is loud, proud, and will feed you until you can't move. Together, they give you the full spectrum of modern Japan.",
    icon: "🚄",
  },

  // ─── kobe + kyoto + osaka ──────────────────────────────────────────
  {
    id: "to-12",
    key: "kobe+kyoto+osaka:any",
    content:
      "Kansai's greatest hits — Kyoto's timeless beauty, Osaka's legendary food culture, and Kobe's sophisticated harbor-city charm. All three cities sit within easy reach of each other, making this one of the most rewarding routes in Japan.",
    icon: "✨",
  },

  // ─── hiroshima + kyoto + osaka ─────────────────────────────────────
  {
    id: "to-13",
    key: "hiroshima+kyoto+osaka:any",
    content:
      "This route takes you from Osaka's street food energy through Kyoto's refined beauty to Hiroshima's powerful history and rebirth. It's a journey that covers Japan's past, present, and the resilience that connects them.",
    icon: "🕊️",
  },

  // ─── kyoto + osaka + tokyo ─────────────────────────────────────────
  {
    id: "to-14",
    key: "kyoto+osaka+tokyo:spring",
    content:
      "The classic Japan trio in cherry blossom season — this is the trip that tops every bucket list for a reason. Ancient Kyoto, delicious Osaka, electric Tokyo, all connected by the world's best train system and draped in pink.",
    icon: "🌸",
  },
  {
    id: "to-15",
    key: "kyoto+osaka+tokyo:any",
    content:
      "Tokyo, Kyoto, and Osaka — the golden triangle of Japan travel. You'll go from neon skyscrapers to zen gardens to sizzling takoyaki stands, and every transition will feel like stepping into a different world. This is Japan at its best.",
    icon: "🗾",
  },

  // ─── solo city: tokyo ──────────────────────────────────────────────
  {
    id: "to-16",
    key: "tokyo:spring",
    content:
      "Tokyo in spring is pure magic — cherry blossoms line the canals, parks turn into hanami picnic grounds, and the whole city takes on a softer glow. You'll have ultramodern marvels and centuries-old gardens competing for your attention every single day.",
    icon: "🌸",
  },
  {
    id: "to-17",
    key: "tokyo:any",
    content:
      "Tokyo is a city that defies simple description — ultramodern skyscrapers tower over hidden shrine gardens, and Michelin-starred restaurants sit next to 500-yen ramen counters. You could visit a hundred times and still discover something new.",
    icon: "🗼",
  },

  // ─── solo city: kyoto ──────────────────────────────────────────────
  {
    id: "to-18",
    key: "kyoto:spring",
    content:
      "A full trip dedicated to Kyoto in spring — you're doing it right. Cherry blossoms over bamboo groves, stone paths through pink-canopied gardens, and matcha everything. This city was made for slow, beautiful days like the ones ahead.",
    icon: "🌸",
  },
  {
    id: "to-19",
    key: "kyoto:fall",
    content:
      "Kyoto in autumn might be the most beautiful place on earth. Every temple, every garden, every winding street becomes a canvas of red, gold, and orange. Take your time — this city rewards those who linger.",
    icon: "🍁",
  },
  {
    id: "to-20",
    key: "kyoto:any",
    content:
      "A trip devoted entirely to Kyoto means you'll get to go beyond the famous spots and into the quiet back streets, hidden gardens, and neighborhood temples that most visitors miss. This city has layers — and you're about to discover them.",
    icon: "⛩️",
  },

  // ─── solo city: osaka ──────────────────────────────────────────────
  {
    id: "to-21",
    key: "osaka:any",
    content:
      "Osaka doesn't hold back, and neither should you. This city is all about flavor — incredible street food, a nightlife scene that pulses with energy, and locals who are famously warm and funny. Come hungry, leave happy.",
    icon: "🐙",
  },

  // ─── solo city: fukuoka ────────────────────────────────────────────
  {
    id: "to-22",
    key: "fukuoka:any",
    content:
      "Fukuoka is Japan's best-kept secret — a relaxed coastal city with some of the country's finest ramen, vibrant yatai food stalls along the river, and a laid-back energy that makes you feel at home instantly.",
    icon: "🍜",
  },

  // ─── solo city: kanazawa ───────────────────────────────────────────
  {
    id: "to-23",
    key: "kanazawa:any",
    content:
      "Kanazawa is where old Japan lives on — one of the country's best-preserved castle towns with stunning gardens, traditional tea districts, and a thriving crafts scene. It has the beauty of Kyoto with a fraction of the crowds.",
    icon: "🏯",
  },

  // ─── solo city: hiroshima ──────────────────────────────────────────
  {
    id: "to-24",
    key: "hiroshima:any",
    content:
      "Hiroshima is a city of profound history and remarkable resilience. Beyond its powerful Peace Memorial, you'll find a vibrant, forward-looking city with incredible okonomiyaki, easy access to Miyajima Island, and some of the friendliest people in Japan.",
    icon: "🕊️",
  },

  // ─── solo city: sapporo ────────────────────────────────────────────
  {
    id: "to-25",
    key: "sapporo:winter",
    content:
      "Sapporo in winter is a wonderland — the famous Snow Festival, world-class skiing nearby, steaming bowls of miso ramen, and the kind of cozy, snowy atmosphere that makes everything feel a little magical.",
    icon: "❄️",
  },
  {
    id: "to-26",
    key: "sapporo:any",
    content:
      "Sapporo brings a completely different flavor to Japan — wide boulevards, craft beer culture, the freshest seafood you'll ever taste, and Hokkaido's stunning natural landscape right at the doorstep. This is Japan's wild north.",
    icon: "🍺",
  },

  // ─── solo city: naha (okinawa) ─────────────────────────────────────
  {
    id: "to-27",
    key: "naha:any",
    content:
      "Naha and Okinawa feel like a different country — turquoise waters, subtropical warmth, a unique Ryukyuan culture, and a pace of life that's refreshingly slow. If you're looking for the side of Japan most visitors never see, this is it.",
    icon: "🏝️",
  },

  // ─── generic fallbacks ─────────────────────────────────────────────
  {
    id: "to-28",
    key: "generic:spring",
    content:
      "You're heading to Japan during cherry blossom season — one of the most beautiful times to visit anywhere on the planet. Every park, riverbank, and temple path becomes a fleeting masterpiece. Your trip is lined up and ready to bloom.",
    icon: "🌸",
  },
  {
    id: "to-29",
    key: "generic:fall",
    content:
      "Autumn in Japan is pure magic — crisp air, fiery foliage, and a warmth to the food and culture that perfectly matches the season. Your itinerary is set, and every day ahead has something worth remembering.",
    icon: "🍁",
  },
  {
    id: "to-30",
    key: "generic:any",
    content:
      "Your Japan adventure is mapped out and ready to go! Each day ahead is packed with experiences you won't find anywhere else — from centuries-old traditions to cutting-edge culture. Let's make it unforgettable.",
    icon: "🇯🇵",
  },
];
