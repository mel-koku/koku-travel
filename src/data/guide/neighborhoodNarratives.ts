import type { NeighborhoodNarrativeTemplate } from "@/types/itineraryGuide";

/**
 * ~40 curated neighborhood narratives keyed by "city:neighborhood".
 * Inserted when 2+ consecutive activities share a neighborhood.
 */
export const NEIGHBORHOOD_NARRATIVE_TEMPLATES: NeighborhoodNarrativeTemplate[] = [
  // ── Kyoto ──────────────────────────────────────────────────────────
  {
    id: "nn-kyoto-higashiyama-1",
    key: "kyoto:higashiyama",
    content:
      "Higashiyama is Kyoto compressed into a single hillside — cobblestone lanes, incense from temple gates, and ceramic shops older than most cities. The next few stops sit within walking distance, so slow down and let the neighborhood unfold.",
  },
  {
    id: "nn-kyoto-higashiyama-2",
    key: "kyoto:higashiyama",
    content:
      "You're in Higashiyama now, where old Kyoto is still the main character. Wooden machiya line the narrow streets and the sound of temple bells drifts between buildings. Everything here rewards patience and wandering.",
  },
  {
    id: "nn-kyoto-arashiyama-1",
    key: "kyoto:arashiyama",
    content:
      "Arashiyama sits at Kyoto's western edge where the city dissolves into mountains and river. The bamboo grove gets the photos, but the real magic is in the quieter paths along the Ōi River and through Saga's temple gardens.",
  },
  {
    id: "nn-kyoto-arashiyama-2",
    key: "kyoto:arashiyama",
    content:
      "You've reached Arashiyama — bamboo, bridges, and the sound of the Hozu River. This is a neighborhood designed for extended stays. Grab a matcha soft serve and let the walk between spots be part of the experience.",
  },
  {
    id: "nn-kyoto-gion-1",
    key: "kyoto:gion",
    content:
      "Gion is where Kyoto's geisha culture still breathes. Lanterns glow along Hanamikoji-dōri at dusk and the tea houses keep their traditions behind sliding doors. Walk quietly — this neighborhood asks for respect.",
  },
  {
    id: "nn-kyoto-fushimi-1",
    key: "kyoto:fushimi",
    content:
      "Fushimi is sake country — the water here has built a brewing tradition for centuries. Between shrine visits, the backstreets hide small sake breweries with tasting rooms that most visitors walk right past.",
  },
  {
    id: "nn-kyoto-kinkakuji-1",
    key: "kyoto:kinkakuji",
    content:
      "The Kinkaku-ji area sits in Kyoto's north, quieter than the central temple circuit. Between the Golden Pavilion and Ryōan-ji's rock garden, there's enough philosophical weight to last an afternoon.",
  },

  // ── Tokyo ──────────────────────────────────────────────────────────
  {
    id: "nn-tokyo-asakusa-1",
    key: "tokyo:asakusa",
    content:
      "Asakusa is old-town Tokyo — Sensō-ji's thunder gate, street food vendors on Nakamise-dōri, and the Sumida River at its back. It's walkable, unhurried, and a world apart from the skyscraper districts.",
  },
  {
    id: "nn-tokyo-asakusa-2",
    key: "tokyo:asakusa",
    content:
      "You're in Asakusa now, where Tokyo feels most like the Edo-era city it once was. Temple incense mixes with yakitori smoke and the rickshaw drivers know every backstreet. Take the side streets — that's where the good stuff hides.",
  },
  {
    id: "nn-tokyo-shibuya-1",
    key: "tokyo:shibuya",
    content:
      "Shibuya runs at a different speed — the crossing, the screens, the steady flow of people. But step one block off Center-gai and you'll find vinyl shops, standing bars, and ramen joints that locals guard jealously.",
  },
  {
    id: "nn-tokyo-shinjuku-1",
    key: "tokyo:shinjuku",
    content:
      "Shinjuku is Tokyo's nerve center — 3.6 million people pass through its station daily. East side is neon and nightlife (Golden Gai, Kabukichō); west side is skyscrapers and the metropolitan government's free observation deck.",
  },
  {
    id: "nn-tokyo-shinjuku-2",
    key: "tokyo:shinjuku",
    content:
      "You're in Shinjuku now, and the scale takes adjustment. Don't try to see it all — pick east or west, day or night. The neighborhood rewards focus over coverage.",
  },
  {
    id: "nn-tokyo-ueno-1",
    key: "tokyo:ueno",
    content:
      "Ueno Park is Tokyo's cultural campus — the National Museum, Western Art museum, zoo, and Tosho-gu shrine all sit within the park's boundaries. Below, Ameyoko market buzzes with a street-market energy rare in modern Tokyo.",
  },
  {
    id: "nn-tokyo-harajuku-1",
    key: "tokyo:harajuku",
    content:
      "Harajuku lives between extremes — Meiji Shrine's ancient forest on one side, Takeshita Street's neon fashion chaos on the other. The backstreets of Ura-Hara split the difference with independent boutiques and quiet cafes.",
  },
  {
    id: "nn-tokyo-akihabara-1",
    key: "tokyo:akihabara",
    content:
      "Akihabara is sensory overload by design — electronics, anime, maid cafes, and retro game shops stacked floor to ceiling. The deeper you go into the back streets, the more specialized (and interesting) the shops get.",
  },
  {
    id: "nn-tokyo-ginza-1",
    key: "tokyo:ginza",
    content:
      "Ginza is Tokyo at its most polished — department stores, galleries, and sushi counters that have been perfecting their craft for generations. On weekends, Chūō-dōri closes to cars and becomes a wide pedestrian boulevard.",
  },
  {
    id: "nn-tokyo-shimokitazawa-1",
    key: "tokyo:shimokitazawa",
    content:
      "Shimokitazawa is Tokyo's indie heart — vintage clothing shops, live music venues, and small theaters packed into narrow lanes. The recent redevelopment added green spaces without losing the neighborhood's DIY soul.",
  },

  // ── Osaka ──────────────────────────────────────────────────────────
  {
    id: "nn-osaka-dotonbori-1",
    key: "osaka:dotonbori",
    content:
      "Dōtonbori is Osaka's appetite made physical — the Glico Man, mechanical crabs, and takoyaki stands every ten meters. It's loud, bright, and unapologetic. This is where you eat first and decide later.",
  },
  {
    id: "nn-osaka-dotonbori-2",
    key: "osaka:dotonbori",
    content:
      "You're in Dōtonbori now, Osaka's most famous food street. The canal reflects the neon signs and every other shop is frying something worth trying. Come hungry, leave full.",
  },
  {
    id: "nn-osaka-shinsekai-1",
    key: "osaka:shinsekai",
    content:
      "Shinsekai is old Osaka — Tsūtenkaku tower rising over streets of kushikatsu shops and retro game arcades. It's rough around the edges and proud of it. The deep-fried everything pairs perfectly with a cold beer.",
  },
  {
    id: "nn-osaka-namba-1",
    key: "osaka:namba",
    content:
      "Namba is Osaka's crossroads — the Namba Parks mall, Ura-Namba's hidden izakayas, and the underground shopping streets all converge here. It's the kind of neighborhood where you can spend hours without meaning to.",
  },
  {
    id: "nn-osaka-umeda-1",
    key: "osaka:umeda",
    content:
      "Umeda is Osaka's business face — sky-high department stores, the Umeda Sky Building's floating garden, and underground shopping labyrinths. But the backstreet izakayas around the train tracks are where the character lives.",
  },

  // ── Nara ────────────────────────────────────────────────────────────
  {
    id: "nn-nara-narapark-1",
    key: "nara:nara park",
    content:
      "Nara Park is where 1,200 sacred deer roam freely among World Heritage temples. The deer are bold — they'll bow for crackers and nose through your bag for snacks. Todai-ji and Kasuga Taisha are both within walking distance.",
  },

  // ── Kamakura ────────────────────────────────────────────────────────
  {
    id: "nn-kamakura-komachi-1",
    key: "kamakura:komachi",
    content:
      "Komachi-dōri runs straight from the station to Tsurugaoka Hachiman-gū shrine — a 10-minute walk lined with shops, cafes, and snack stands. The side streets hide smaller temples and tea houses worth exploring.",
  },

  // ── Hiroshima ───────────────────────────────────────────────────────
  {
    id: "nn-hiroshima-peace-1",
    key: "hiroshima:peace memorial park",
    content:
      "The Peace Memorial Park sits where the city's commercial center once stood. The museum, the dome, and the cenotaph are all within the park — a deliberate preservation of memory in a city that chose to rebuild around it.",
  },

  // ── Kanazawa ────────────────────────────────────────────────────────
  {
    id: "nn-kanazawa-higashichaya-1",
    key: "kanazawa:higashi chaya",
    content:
      "Higashi Chaya is Kanazawa's best-preserved geisha district — wooden lattice facades, gold leaf shops, and tea houses that still operate. It's compact enough to cover on foot, and the attention to detail in every building is striking.",
  },

  // ── Fukuoka ─────────────────────────────────────────────────────────
  {
    id: "nn-fukuoka-tenjin-1",
    key: "fukuoka:tenjin",
    content:
      "Tenjin is Fukuoka's downtown core — department stores, underground shopping streets, and some of the best yatai (street food stalls) along the Naka River. The stalls open at dusk and serve tonkotsu ramen until late.",
  },
  {
    id: "nn-fukuoka-nakasu-1",
    key: "fukuoka:nakasu",
    content:
      "Nakasu sits on an island between two rivers — it's Fukuoka's entertainment district by night, with yatai stalls lining the waterfront. The neon reflects off the Naka River and the ramen steam rises into the streetlights.",
  },

  // ── Hakone ──────────────────────────────────────────────────────────
  {
    id: "nn-hakone-gora-1",
    key: "hakone:gora",
    content:
      "Gōra is Hakone's transit hub — the switchback railway, cable car, and ropeway all converge here. Between rides, the open-air museum and hot spring foot baths make the waiting worthwhile.",
  },

  // ── Nagasaki ────────────────────────────────────────────────────────
  {
    id: "nn-nagasaki-dejima-1",
    key: "nagasaki:dejima",
    content:
      "Dejima was Japan's only window to the West during 200 years of isolation — a fan-shaped island where Dutch traders lived. The restored buildings and surrounding Chinatown reflect Nagasaki's layered international history.",
  },

  // ── Kobe ────────────────────────────────────────────────────────────
  {
    id: "nn-kobe-kitano-1",
    key: "kobe:kitano",
    content:
      "Kitano-chō climbs the hillside above Kobe's harbor — Western-style mansions (ijinkan) built by foreign traders in the Meiji era line the streets. The views of the port below and the architectural contrast make it a unique walk.",
  },

  // ── City-level fallbacks ───────────────────────────────────────────
  {
    id: "nn-kyoto-any-1",
    key: "kyoto:any",
    content:
      "This corner of Kyoto has its own rhythm. The next few activities are close together — take the walking route and let the neighborhood set the pace.",
  },
  {
    id: "nn-tokyo-any-1",
    key: "tokyo:any",
    content:
      "You're settling into this part of Tokyo. The next stops are walkable from here, so put the transit app away and explore on foot — that's when this city reveals its best details.",
  },
  {
    id: "nn-osaka-any-1",
    key: "osaka:any",
    content:
      "This stretch of Osaka is best explored on foot. The activities ahead cluster close together, and the streets between them are half the experience.",
  },

  // ── Generic fallbacks ──────────────────────────────────────────────
  {
    id: "nn-any-any-1",
    key: "any:any",
    content:
      "The next few stops share a neighborhood, so you can walk between them and soak in the streets along the way. Sometimes the walk is the best part.",
  },
  {
    id: "nn-any-any-2",
    key: "any:any",
    content:
      "You're staying in one area for a while — good. The best way to know a neighborhood is to spend time in it. Take the side streets between activities.",
  },
];
