import type { KnownCityId } from "@/types/trip";
import { ALL_CITY_IDS } from "@/data/regions";

export type CityPageData = {
  id: KnownCityId;
  name: string;
  nameJapanese: string;
  tagline: string;
  description: string;
  ogDescription: string;
};

export const CITY_PAGE_DATA: Record<KnownCityId, CityPageData> = {
  // --- Kansai ---
  kyoto: {
    id: "kyoto",
    name: "Kyoto",
    nameJapanese: "京都",
    tagline: "Temples, tea, and a thousand quiet corners",
    description:
      "Moss gardens, bamboo groves, wooden machiya lining narrow streets. Kyoto moves at its own pace. One that rewards slowing down. Morning markets give way to afternoon tea ceremonies, and by evening the geisha district glows with lantern light.",
    ogDescription:
      "Explore Kyoto's temples, tea houses, bamboo groves, and quiet gardens. Plan your trip with curated local favorites.",
  },
  osaka: {
    id: "osaka",
    name: "Osaka",
    nameJapanese: "大阪",
    tagline: "Loud, bright, and impossibly delicious",
    description:
      "Osaka runs on appetite. Street food sizzles in Dotonbori, okonomiyaki flips in Shinsekai, and takoyaki stands line every corner. Beyond the neon, castle grounds and riverside paths reveal a city that knows how to balance chaos with calm.",
    ogDescription:
      "Discover Osaka's legendary street food, neon nightlife, and castle grounds. Browse top-rated places and local favorites.",
  },
  nara: {
    id: "nara",
    name: "Nara",
    nameJapanese: "奈良",
    tagline: "Deer, ancient wood, and deep quiet",
    description:
      "Deer bow in the park. The Great Buddha sits in the world's largest wooden building. Nara was Japan's first permanent capital, and that weight still shows. In the massive temple gates, the old-growth forests, and the unhurried pace of everything.",
    ogDescription:
      "Visit Nara's friendly deer park, ancient temples, and Japan's first capital. Find the best things to see and do in Nara.",
  },
  kobe: {
    id: "kobe",
    name: "Kobe",
    nameJapanese: "神戸",
    tagline: "Port city charm between mountains and sea",
    description:
      "Wedged between the Rokko Mountains and Osaka Bay, Kobe packs a lot into a small footprint. The waterfront Harborland, Chinatown's bustle, hillside herb gardens, and yes, the beef. A cosmopolitan port city that's been welcoming the world since 1868.",
    ogDescription:
      "Explore Kobe's waterfront, famous beef, sake breweries, and mountain views. Your guide to the best of Kobe, Japan.",
  },
  otsu: {
    id: "otsu",
    name: "Otsu",
    nameJapanese: "大津",
    tagline: "Lake Biwa's quiet shore",
    description:
      "Japan's largest lake stretches out from Otsu's doorstep. Ancient temples dot the hillsides, and the old Tokaido road still traces its path through town. Close enough to Kyoto for a day trip, far enough to feel like a different world.",
    ogDescription:
      "Discover Otsu on Lake Biwa. Ancient temples, scenic lakeside walks, and a peaceful escape near Kyoto.",
  },

  himeji: {
    id: "himeji",
    name: "Himeji",
    nameJapanese: "姫路",
    tagline: "The white castle that survived everything",
    description:
      "Himeji Castle stands as the finest original castle in Japan. Brilliant white walls and layered roofs rise above the city, untouched by war, earthquake, or fire. The surrounding gardens shift with the seasons. Below the castle, the city moves at a pace that lets you actually look up.",
    ogDescription:
      "Visit Himeji Castle, Japan's most spectacular original castle. A UNESCO World Heritage site and easy stop between Osaka and Hiroshima.",
  },
  wakayama: {
    id: "wakayama",
    name: "Wakayama",
    nameJapanese: "和歌山",
    tagline: "Pilgrimage trails and the coast where Japan begins",
    description:
      "The Kumano Kodo pilgrimage trails start here, threading through mountains to ancient shrines. The coastline is dramatic. Shirahama's white sand beach sits beside onsen that have been flowing for 1,300 years. Wakayama is also home to Koyasan, the mountaintop monastery where you sleep among the monks.",
    ogDescription:
      "Explore Wakayama's Kumano Kodo pilgrimage, Koyasan monasteries, and Shirahama coastal onsen. Southern Kansai's spiritual heartland.",
  },

  // --- Kanto ---
  tokyo: {
    id: "tokyo",
    name: "Tokyo",
    nameJapanese: "東京",
    tagline: "A hundred cities in one",
    description:
      "Every neighborhood is its own world. Shibuya's energy, Yanaka's old-town lanes, Akihabara's electric hum, Shimokitazawa's vintage shops. Tokyo doesn't ask you to choose. It gives you everything and lets you find your own version of it.",
    ogDescription:
      "Plan your Tokyo trip with curated places across every neighborhood. Temples, ramen shops, neon streets, and local favorites.",
  },
  yokohama: {
    id: "yokohama",
    name: "Yokohama",
    nameJapanese: "横浜",
    tagline: "Japan's original window to the world",
    description:
      "Yokohama's waterfront tells the story of a fishing village turned international port. Red brick warehouses, the largest Chinatown in Japan, cup noodle museums, and a skyline that lights up at sunset. Big-city energy with a harbor breeze.",
    ogDescription:
      "Explore Yokohama's Chinatown, waterfront, and creative museums. Discover top things to do in Japan's second-largest city.",
  },
  kamakura: {
    id: "kamakura",
    name: "Kamakura",
    nameJapanese: "鎌倉",
    tagline: "Seaside shrines and ancient power",
    description:
      "The Great Buddha sits in the open air. Hiking trails connect hilltop temples. The Enoden train rattles along the coast. Kamakura was once the seat of Japan's military government, and its temples and shrines carry that gravity. Softened by salt air and surfers.",
    ogDescription:
      "Visit Kamakura's Great Buddha, coastal temples, and seaside hiking trails. A perfect day trip from Tokyo.",
  },
  nikko: {
    id: "nikko",
    name: "Nikkō",
    nameJapanese: "日光",
    tagline: "Ornate shrines in mountain forest",
    description:
      "Tōshō-gū shrine erupts with gold leaf and carved dragons amid towering cedars. Nearby, waterfalls crash through autumn gorges and hot springs steam in the cold mountain air. Nikkō is where Japan's baroque impulse meets raw nature.",
    ogDescription:
      "Discover Nikkō's lavish shrines, waterfalls, and mountain hot springs. Plan your visit to this UNESCO World Heritage site.",
  },
  hakone: {
    id: "hakone",
    name: "Hakone",
    nameJapanese: "箱根",
    tagline: "Hot springs with a view of Fuji",
    description:
      "On a clear day, Mt. Fuji fills the horizon from Lake Ashi's shore. Hakone is Tokyo's favorite escape. Pirate ships on the lake, open-air museums in the hills, volcanic steam vents, and ryokan after ryokan with private onsen baths.",
    ogDescription:
      "Explore Hakone's hot springs, Lake Ashi, and Mt. Fuji views. Your guide to the best onsen town near Tokyo.",
  },

  kawaguchiko: {
    id: "kawaguchiko",
    name: "Kawaguchiko",
    nameJapanese: "河口湖",
    tagline: "Fuji reflected in still water",
    description:
      "Lake Kawaguchi is where Japan's most famous mountain meets its own reflection. The Fuji Five Lakes area offers the postcard view, but also lavender fields, lava caves, and ropeway rides to panoramic viewpoints. In autumn, the Momiji Corridor turns crimson. In winter, Fuji's snow cap hangs over frozen stillness.",
    ogDescription:
      "Discover Kawaguchiko's iconic Mt. Fuji views, lake shores, and seasonal landscapes. The best base for experiencing Fuji up close.",
  },

  // --- Chubu ---
  nagoya: {
    id: "nagoya",
    name: "Nagoya",
    nameJapanese: "名古屋",
    tagline: "Industrial muscle, culinary soul",
    description:
      "Nagoya doesn't shout for attention, but it rewards the curious. Miso katsu, hitsumabushi eel, and kishimen noodles form a food culture unlike anywhere else. The castle gleams gold, Toyota's heritage is on display, and the Osu district buzzes with indie energy.",
    ogDescription:
      "Discover Nagoya's unique food culture, golden castle, and vibrant Osu district. Your guide to central Japan's underrated capital.",
  },
  kanazawa: {
    id: "kanazawa",
    name: "Kanazawa",
    nameJapanese: "金沢",
    tagline: "Samurai districts and perfect gardens",
    description:
      "Kenroku-en is one of Japan's three great gardens. The samurai and geisha districts survived the war untouched. Gold leaf covers everything from temples to ice cream. Kanazawa is what Kyoto might look like if fewer people knew about it.",
    ogDescription:
      "Explore Kanazawa's samurai streets, Kenroku-en garden, and gold leaf culture. A quieter alternative to Kyoto.",
  },
  takayama: {
    id: "takayama",
    name: "Takayama",
    nameJapanese: "高山",
    tagline: "Edo-era charm in the Japanese Alps",
    description:
      "Morning markets line the river. Sake breweries hang cedar balls over their doors. Preserved Edo-period streets look like a film set, except people still live and work here. Takayama is the gateway to Shirakawa-go and the heart of Japan's alpine culture.",
    ogDescription:
      "Visit Takayama's Edo streets, morning markets, and sake breweries. Gateway to Shirakawa-go and the Japanese Alps.",
  },
  nagano: {
    id: "nagano",
    name: "Nagano",
    nameJapanese: "長野",
    tagline: "Snow monkeys, temples, and alpine trails",
    description:
      "Zenkō-ji temple has drawn pilgrims for 1,400 years. Snow monkeys soak in hot springs nearby. In winter, some of the best powder in Japan falls on Hakuba and Nozawa. Nagano is where spiritual Japan meets adventure Japan.",
    ogDescription:
      "Discover Nagano's snow monkeys, ancient Zenkō-ji temple, and world-class ski resorts. Plan your mountain adventure.",
  },
  niigata: {
    id: "niigata",
    name: "Niigata",
    nameJapanese: "新潟",
    tagline: "Rice country and sake's spiritual home",
    description:
      "Japan's best rice grows here, and where the rice goes, sake follows. Over 90 breweries line the prefecture. Beyond the paddies, Sado Island preserves traditions the mainland forgot, and the Fuji Rock Festival draws crowds to the mountains each summer.",
    ogDescription:
      "Explore Niigata's sake breweries, rice paddies, and Sado Island. Japan's most underrated stretch of the Sea of Japan coast.",
  },

  ise: {
    id: "ise",
    name: "Ise",
    nameJapanese: "伊勢",
    tagline: "Japan's most sacred shrine and the street that feeds it",
    description:
      "Ise Grand Shrine is the spiritual center of Shinto, rebuilt every 20 years for over a millennium. The inner shrine sits deep in a cryptomeria forest, hushed and immense. Oharai-machi and Okage Yokocho, the streets leading to the shrine, are lined with mochi shops, teahouses, and Ise udon stalls.",
    ogDescription:
      "Visit Ise Grand Shrine, the spiritual heart of Shinto Japan. Explore the sacred forests and traditional food streets of Ise.",
  },
  toyama: {
    id: "toyama",
    name: "Toyama",
    nameJapanese: "富山",
    tagline: "Glass art, fresh sushi, and a wall of snow",
    description:
      "The Tateyama Kurobe Alpine Route carves through 20-meter snow walls in spring. Toyama Bay delivers some of Japan's freshest sushi, especially the translucent white shrimp found nowhere else. The city itself is compact and modern, with a world-class glass art museum and a tram network that makes everything walkable.",
    ogDescription:
      "Explore Toyama's Alpine Route snow walls, Toyama Bay sushi, and glass art. Gateway to the Japanese Alps' most dramatic scenery.",
  },

  // --- Kyushu ---
  fukuoka: {
    id: "fukuoka",
    name: "Fukuoka",
    nameJapanese: "福岡",
    tagline: "Yatai stalls, ramen, and easy living",
    description:
      "Fukuoka's yatai food stalls light up the riverbanks at dusk. This is where tonkotsu ramen was born, and the city still takes it very seriously. Compact, walkable, and blessed with mild weather. It regularly tops Japan's most livable city rankings.",
    ogDescription:
      "Discover Fukuoka's yatai street food, legendary ramen, and relaxed coastal lifestyle. Japan's most livable city awaits.",
  },
  nagasaki: {
    id: "nagasaki",
    name: "Nagasaki",
    nameJapanese: "長崎",
    tagline: "Where worlds met on a hillside harbor",
    description:
      "Built on steep hills overlooking a harbor, Nagasaki has been Japan's portal to the outside world for centuries. Dutch, Portuguese, and Chinese influences blend in the architecture, the food, and the festivals. The Peace Park stands as a quiet reminder of resilience.",
    ogDescription:
      "Visit Nagasaki's hillside harbor, Peace Park, and centuries of cross-cultural history. A city of resilience and beauty.",
  },
  kumamoto: {
    id: "kumamoto",
    name: "Kumamoto",
    nameJapanese: "熊本",
    tagline: "Castle town at the edge of a volcano",
    description:
      "Kumamoto Castle, one of Japan's finest, is still being restored after the 2016 earthquake, and watching it come back is part of the experience. Mt. Aso's caldera steams nearby. Horse meat sashimi is a local specialty. Kumamoto is tougher than it looks.",
    ogDescription:
      "Explore Kumamoto's iconic castle, Mt. Aso volcano, and unique local cuisine. A resilient city in the heart of Kyushu.",
  },
  kagoshima: {
    id: "kagoshima",
    name: "Kagoshima",
    nameJapanese: "鹿児島",
    tagline: "Japan's Naples, with an active volcano",
    description:
      "Sakurajima volcano smokes across the bay. An active, visible reminder that this is volcanic country. Sand baths in Ibusuki, black pork tonkatsu, sweet potato shochu, and a subtropical warmth that sets Kagoshima apart from the rest of Japan.",
    ogDescription:
      "Discover Kagoshima's Sakurajima volcano, sand baths, and subtropical charm. Japan's gateway to the south.",
  },
  oita: {
    id: "oita",
    name: "Ōita",
    nameJapanese: "大分",
    tagline: "Hot spring capital of Japan",
    description:
      "Beppu alone has more hot springs than anywhere else in the country. The Hells of Beppu steam in surreal colors. Yufuin offers a gentler version. Boutique ryokan, art museums, and misty mountain mornings. Ōita is where Japan goes to soak.",
    ogDescription:
      "Visit Ōita's legendary hot springs in Beppu and Yufuin. Explore Japan's onsen capital and its steaming volcanic landscape.",
  },
  yakushima: {
    id: "yakushima",
    name: "Yakushima",
    nameJapanese: "屋久島",
    tagline: "Ancient forests and the spirit of Mononoke",
    description:
      "Cedar trees thousands of years old stand wrapped in moss on this round, mountainous island south of Kyushu. Jomon Sugi, the oldest, has lived for millennia. The forests inspired Princess Mononoke. Waterfalls, sea turtles, and more rain than almost anywhere in Japan.",
    ogDescription:
      "Trek Yakushima's ancient cedar forests, see Jomon Sugi, and discover the island that inspired Princess Mononoke.",
  },

  miyazaki: {
    id: "miyazaki",
    name: "Miyazaki",
    nameJapanese: "宮崎",
    tagline: "Gorges, coastal shrines, and year-round warmth",
    description:
      "Takachiho Gorge cuts deep into volcanic rock, its waterfall dropping into an emerald river you can boat through. Aoshima's shrine sits on a tiny island ringed by wave-carved rock formations called the Devil's Washboard. Miyazaki is warmer than the rest of Kyushu, with palm-lined streets and a surf culture that keeps going through winter.",
    ogDescription:
      "Discover Miyazaki's Takachiho Gorge, Aoshima shrine, and subtropical coastline. Kyushu's warmest corner and a surfer's paradise.",
  },
  kitakyushu: {
    id: "kitakyushu",
    name: "Kitakyūshū",
    nameJapanese: "北九州",
    tagline: "Industrial grit turned into gardens and street food",
    description:
      "Kokura Castle anchors the old town, where covered shopping streets serve some of Kyushu's best yakiudon. Kawachi Fujien's wisteria tunnels explode in purple every spring. The Kanmon Strait connects Kyushu to Honshu, and you can walk the undersea tunnel to Shimonoseki. A working city with genuine character.",
    ogDescription:
      "Visit Kitakyushu's Kokura Castle, Kawachi Fujien wisteria, and Kanmon Strait. The gateway between Kyushu and Honshu.",
  },

  // --- Hokkaido ---
  sapporo: {
    id: "sapporo",
    name: "Sapporo",
    nameJapanese: "札幌",
    tagline: "Powder snow, miso ramen, and craft beer",
    description:
      "Wide streets, a famous snow festival, and miso ramen that ruins every bowl you eat after it. Sapporo is Hokkaido's capital and gateway. From here, lavender fields, ski resorts, and seafood markets are all within reach.",
    ogDescription:
      "Plan your Sapporo trip. Snow festivals, miso ramen, craft beer, and gateway to Hokkaido's wilderness.",
  },
  hakodate: {
    id: "hakodate",
    name: "Hakodate",
    nameJapanese: "函館",
    tagline: "Morning markets and million-dollar nights",
    description:
      "The night view from Mt. Hakodate is one of Japan's three great views. Below, the morning market opens at dawn with crab, uni, and squid so fresh it's still moving. Historic Western-style buildings line the waterfront of this charming port city.",
    ogDescription:
      "Discover Hakodate's legendary night view, morning fish market, and historic port. Southern Hokkaido's most charming city.",
  },
  asahikawa: {
    id: "asahikawa",
    name: "Asahikawa",
    nameJapanese: "旭川",
    tagline: "Ramen, polar bears, and powder snow",
    description:
      "Asahiyama Zoo pioneered Japan's behavioral exhibits, letting penguins parade and polar bears swim overhead. Asahikawa ramen is soy-based with a lard cap to keep it hot in the cold. The city is a gateway to Daisetsuzan, Hokkaido's largest national park.",
    ogDescription:
      "Visit Asahikawa's famous zoo, soy ramen, and gateway to Daisetsuzan National Park. Central Hokkaido's welcoming hub.",
  },
  kushiro: {
    id: "kushiro",
    name: "Kushiro",
    nameJapanese: "釧路",
    tagline: "Cranes, wetlands, and the edge of Japan",
    description:
      "Kushiro Marshland is Japan's largest wetland, home to the red-crowned crane. In winter, the cranes dance against snow-covered fields. The Washo Market serves katte-don (pick-your-own seafood bowls). Eastern Hokkaido starts here, vast and unhurried.",
    ogDescription:
      "Discover Kushiro's red-crowned cranes, vast wetlands, and fresh seafood markets. Gateway to eastern Hokkaido's wild frontier.",
  },
  abashiri: {
    id: "abashiri",
    name: "Abashiri",
    nameJapanese: "網走",
    tagline: "Drift ice and the Sea of Okhotsk",
    description:
      "Every winter, drift ice from the Sea of Okhotsk reaches Abashiri's shores. Icebreaker cruises push through the floes. The former prison museum tells stories of the convicts who built Hokkaido's roads. In summer, flower fields and lakes take over.",
    ogDescription:
      "Experience Abashiri's drift ice cruises, prison museum, and Sea of Okhotsk frontier. Hokkaido's dramatic northern coast.",
  },
  wakkanai: {
    id: "wakkanai",
    name: "Wakkanai",
    nameJapanese: "稚内",
    tagline: "Japan's northern tip, where the wind never stops",
    description:
      "Cape Soya is the northernmost point of Japan. On clear days, you can see Sakhalin. Wakkanai is remote, wind-battered, and uniquely atmospheric. Rishiri and Rebun islands sit offshore, one a volcanic cone, the other a wildflower paradise.",
    ogDescription:
      "Visit Wakkanai, Japan's northernmost city. See Cape Soya, Rishiri Island, and the wild shores of Hokkaido's far north.",
  },

  // --- Tohoku ---
  sendai: {
    id: "sendai",
    name: "Sendai",
    nameJapanese: "仙台",
    tagline: "City of trees and grilled beef tongue",
    description:
      "Sendai is Tohoku's largest city and gateway to the region. Tree-lined Jozenji-dori glows with lights in winter. Gyutan (beef tongue) is the local obsession. Matsushima Bay's pine-covered islands are a short train ride away.",
    ogDescription:
      "Explore Sendai's tree-lined avenues, beef tongue cuisine, and easy access to Matsushima Bay. Tohoku's welcoming capital.",
  },
  morioka: {
    id: "morioka",
    name: "Morioka",
    nameJapanese: "盛岡",
    tagline: "Three noodles and a castle ruin",
    description:
      "Morioka is famous for three noodle dishes. Wanko soba, jajamen, and reimen. The castle ruins overlook two rivers, and the craft scene (Nambu ironware, in particular) runs deep. A small city with an outsized food reputation.",
    ogDescription:
      "Visit Morioka for its legendary noodle culture, Nambu ironware, and riverside castle ruins. Tohoku's hidden food capital.",
  },
  aomori: {
    id: "aomori",
    name: "Aomori",
    nameJapanese: "青森",
    tagline: "Nebuta festivals and deep northern soul",
    description:
      "Every August, massive illuminated floats parade through the streets during the Nebuta Festival. The rest of the year, Aomori offers apple orchards, the ancient Sannai-Maruyama ruins, and some of the heaviest snowfall in Japan.",
    ogDescription:
      "Discover Aomori's spectacular Nebuta Festival, apple country, and Jomon ruins. Northern Honshu at its most dramatic.",
  },
  akita: {
    id: "akita",
    name: "Akita",
    nameJapanese: "秋田",
    tagline: "Sake, cedar, and winter festivals",
    description:
      "Lake Tazawa, Japan's deepest, shimmers in the mountains. Kakunodate's samurai district preserves centuries of warrior culture. In winter, the Yokote Kamakura festival builds snow igloos lit from within. Akita is rural Japan at its most atmospheric.",
    ogDescription:
      "Explore Akita's samurai district, Lake Tazawa, and magical winter festivals. Deep rural Japan in Tohoku's west.",
  },

  yamagata: {
    id: "yamagata",
    name: "Yamagata",
    nameJapanese: "山形",
    tagline: "Snow monsters, sacred mountains, and cherry blossoms by the river",
    description:
      "Zao's juhyo (snow monsters) are trees encased in ice and snow, forming surreal sculptures across the mountainside every winter. Dewa Sanzan's three sacred mountains have drawn yamabushi pilgrims for centuries. In spring, the Kajo Park moat fills with cherry blossoms. Yamagata beef rivals Kobe, and the soba is some of Japan's finest.",
    ogDescription:
      "Explore Yamagata's Zao snow monsters, Dewa Sanzan pilgrimage, and legendary beef. Tohoku's most scenic mountain prefecture.",
  },
  aizuwakamatsu: {
    id: "aizuwakamatsu",
    name: "Aizu-Wakamatsu",
    nameJapanese: "会津若松",
    tagline: "Samurai loyalty, lacquerware, and mountain sake",
    description:
      "Tsuruga Castle's red-tiled roof is unique in Japan. The Aizu samurai made their last stand here, and that stubborn loyalty still defines the city's character. Nanukamachi's warehouses hold lacquerware workshops. Kitakata, nearby, serves ramen for breakfast. Over 30 sake breweries line the streets, fed by pure mountain water.",
    ogDescription:
      "Visit Aizu-Wakamatsu's Tsuruga Castle, samurai heritage, and sake breweries. The proud heart of Fukushima Prefecture.",
  },

  // --- Chugoku ---
  hiroshima: {
    id: "hiroshima",
    name: "Hiroshima",
    nameJapanese: "広島",
    tagline: "Peace, resilience, and the best okonomiyaki",
    description:
      "The Peace Memorial stands as the city's conscience, but Hiroshima today is vibrant and forward-looking. Layered okonomiyaki sizzles on griddles everywhere. Miyajima's floating torii gate is a ferry ride away. A city that turned tragedy into purpose.",
    ogDescription:
      "Visit Hiroshima's Peace Memorial, Miyajima Island, and legendary okonomiyaki scene. A city of hope and resilience.",
  },
  okayama: {
    id: "okayama",
    name: "Okayama",
    nameJapanese: "岡山",
    tagline: "Sunshine, gardens, and the Seto Inland Sea",
    description:
      "Korakuen is one of Japan's three great gardens. The black castle rises beside it. Kurashiki's canal district preserves white-walled warehouses turned galleries. Okayama bills itself as the 'Land of Sunshine'. And the weather usually agrees.",
    ogDescription:
      "Explore Okayama's Korakuen garden, black castle, and Kurashiki's canal district. Sunny gateway to the Seto Inland Sea.",
  },
  matsue: {
    id: "matsue",
    name: "Matsue",
    nameJapanese: "松江",
    tagline: "Castle town on the water",
    description:
      "One of Japan's few original castles stands over a city threaded with canals and bridges. Lafcadio Hearn made his home here, drawn by the ghost stories and old-world atmosphere. Sunset over Lake Shinji is worth the trip alone.",
    ogDescription:
      "Discover Matsue's original castle, canal-laced streets, and Lake Shinji sunsets. Japan's most atmospheric castle town.",
  },
  tottori: {
    id: "tottori",
    name: "Tottori",
    nameJapanese: "鳥取",
    tagline: "Sand dunes and unexpected landscapes",
    description:
      "Japan has sand dunes. And they're magnificent. The Tottori Sand Dunes stretch along the Sea of Japan coast, shifting with the wind. Beyond the dunes, pear orchards, hot springs, and some of the freshest crab in the country.",
    ogDescription:
      "Visit Tottori's stunning sand dunes, fresh crab, and Sea of Japan coastline. Japan's most surprising landscape.",
  },

  shimonoseki: {
    id: "shimonoseki",
    name: "Shimonoseki",
    nameJapanese: "下関",
    tagline: "Fugu capital at the tip of Honshu",
    description:
      "Shimonoseki is where Honshu ends and the Kanmon Strait begins. Karato Market's auction floor opens to the public for sushi breakfast. This is Japan's fugu (pufferfish) capital, where the deadly delicacy is an everyday food. The undersea tunnel to Kyushu is a 15-minute walk. Dan-no-ura, where the samurai era began, happened in these waters.",
    ogDescription:
      "Discover Shimonoseki's fugu cuisine, Karato Market, and the Kanmon Strait. Where Honshu meets Kyushu at Japan's western tip.",
  },

  // --- Shikoku ---
  matsuyama: {
    id: "matsuyama",
    name: "Matsuyama",
    nameJapanese: "松山",
    tagline: "Japan's oldest hot spring and a hilltop castle",
    description:
      "Dōgo Onsen has been welcoming bathers for over 3,000 years. It inspired the bathhouse in Spirited Away. Above the city, Matsuyama Castle commands the hilltop. Trams rattle through streets lined with haiku. This is Shiki's hometown, after all.",
    ogDescription:
      "Visit Matsuyama's ancient Dōgo Onsen, hilltop castle, and haiku heritage. Shikoku's largest city and cultural heart.",
  },
  takamatsu: {
    id: "takamatsu",
    name: "Takamatsu",
    nameJapanese: "高松",
    tagline: "Udon, art islands, and sculpted gardens",
    description:
      "Ritsurin Garden is one of Japan's finest. 75 acres of sculpted pines and lotus ponds. Takamatsu is the gateway to Naoshima and the Seto art islands. And the udon here is the real deal. Sanuki udon, firm and chewy, eaten at no-frills shops across the city.",
    ogDescription:
      "Explore Takamatsu's Ritsurin Garden, Sanuki udon, and gateway to Naoshima's art islands. Shikoku's creative capital.",
  },
  tokushima: {
    id: "tokushima",
    name: "Tokushima",
    nameJapanese: "徳島",
    tagline: "Wild rivers and the dance of a million",
    description:
      "Every August, the Awa Odori festival transforms the city. A million spectators watch dancers fill the streets. The rest of the year, the Iya Valley's vine bridges and indigo-dyed rivers draw adventurers to some of Japan's wildest terrain.",
    ogDescription:
      "Discover Tokushima's Awa Odori festival, Iya Valley vine bridges, and indigo craft heritage. Shikoku's wild heart.",
  },
  kochi: {
    id: "kochi",
    name: "Kōchi",
    nameJapanese: "高知",
    tagline: "Sunday markets and bonito by the flame",
    description:
      "The Sunday Market has run for over 300 years. Katsuo no tataki, bonito seared over straw flames, is the signature dish. Kōchi is the wildest corner of Shikoku, where rivers run clear, capes jut into the Pacific, and people drink more sake per capita than anywhere in Japan.",
    ogDescription:
      "Visit Kōchi's 300-year-old Sunday Market, flame-seared bonito, and Pacific coastline. Shikoku's spirited southern capital.",
  },

  iyavalley: {
    id: "iyavalley",
    name: "Iya Valley",
    nameJapanese: "祖谷",
    tagline: "Vine bridges over emerald gorges",
    description:
      "The Iya Valley is one of Japan's three most secluded regions. Kazurabashi vine bridges sway over the gorge, rebuilt every three years using mountain vines. The water runs a green so deep it looks lit from below. Thatched-roof farmhouses cling to impossibly steep slopes. Getting here takes effort. That's the point.",
    ogDescription:
      "Explore the Iya Valley's vine bridges, emerald gorges, and remote thatched farmhouses. Shikoku's most dramatic hidden landscape.",
  },

  // --- Okinawa ---
  naha: {
    id: "naha",
    name: "Naha",
    nameJapanese: "那覇",
    tagline: "Tropical rhythm, Ryukyu soul",
    description:
      "Shuri Castle sits above a city that feels more Southeast Asian than Japanese. Kokusai-dori buzzes with shops and izakaya. The beaches are nearby but the real draw is the culture. Ryukyuan music, awamori spirits, and a pace of life the mainland left behind.",
    ogDescription:
      "Explore Naha's Shuri Castle, Kokusai-dori, and Ryukyuan culture. Your gateway to Okinawa's tropical paradise.",
  },
  ishigaki: {
    id: "ishigaki",
    name: "Ishigaki",
    nameJapanese: "石垣",
    tagline: "Coral reefs, mangroves, and island time",
    description:
      "Gateway to the Yaeyama archipelago, Ishigaki sits closer to Taipei than Tokyo. Crystal waters surround coral reefs teeming with life. Day boats connect to Taketomi's star-sand beaches and Iriomote's jungle rivers. On the island itself, Kabira Bay glows an impossible blue.",
    ogDescription:
      "Discover Ishigaki's coral reefs, Kabira Bay, and the Yaeyama island chain. Plan your tropical Japan escape.",
  },
  miyako: {
    id: "miyako",
    name: "Miyako",
    nameJapanese: "宮古",
    tagline: "Bridges, beaches, and water so clear it glows",
    description:
      "Miyako-jima has some of the clearest water in Japan. Maehama Beach stretches in white sand, Irabu Bridge connects three islands by car, and the coral reefs below Yonaha are snorkeler's paradise. No jungles, no mountains, just sun, salt, and endless blue.",
    ogDescription:
      "Explore Miyako Island's crystal-clear beaches, coral reefs, and stunning island bridges. Okinawa's most beautiful water.",
  },
  amami: {
    id: "amami",
    name: "Amami",
    nameJapanese: "奄美",
    tagline: "Mangroves, mud-dyed silk, and wild subtropical shores",
    description:
      "Amami Oshima sits between Kyushu and Okinawa, a subtropical island with UNESCO-listed forests. Mangrove kayaking, traditional mud-dyeing (dorozome), and empty beaches define the experience. The Amami black rabbit lives in these forests and nowhere else on Earth.",
    ogDescription:
      "Discover Amami Oshima's UNESCO mangrove forests, mud-dyed silk, and pristine subtropical beaches. Japan's wild island.",
  },
};

export function getCityPageData(slug: string): CityPageData | null {
  return CITY_PAGE_DATA[slug as KnownCityId] ?? null;
}

export function getAllCitySlugs(): string[] {
  return [...ALL_CITY_IDS];
}
