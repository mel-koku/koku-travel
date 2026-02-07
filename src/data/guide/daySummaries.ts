import type { DaySummaryTemplate } from "@/types/itineraryGuide";

export const DAY_SUMMARY_TEMPLATES: DaySummaryTemplate[] = [
  // ─── Kyoto ────────────────────────────────────────────────────────────
  {
    id: "ds-1",
    key: "kyoto:cultural",
    content:
      "What a day of discovery. Kyoto has a way of making centuries feel close — every temple garden, every shrine path tells a story. If you still have energy, an evening stroll through Gion might reward you with the sight of a geiko heading to work.",
    icon: "🌙",
  },
  {
    id: "ds-2",
    key: "kyoto:food-focused",
    content:
      "From delicate kaiseki to humble street-side yatsuhashi, Kyoto's food is as refined as its gardens. Let tonight settle gently — maybe a cup of hojicha at your hotel before calling it a night.",
    icon: "🍵",
  },
  {
    id: "ds-3",
    key: "kyoto:nature",
    content:
      "Bamboo groves, moss gardens, riverside paths — Kyoto wraps nature in a kind of quiet poetry. Your legs might be tired, but hopefully your mind feels a little lighter. Sleep well tonight.",
    icon: "🎋",
  },
  {
    id: "ds-4",
    key: "kyoto:shopping",
    content:
      "Between the ceramic shops on Ninenzaka and the craft studios tucked into machiya, Kyoto shopping is really treasure hunting. Check your bags, admire your finds, and rest up for tomorrow.",
    icon: "🏮",
  },
  {
    id: "ds-5",
    key: "kyoto:mixed",
    content:
      "Temples in the morning, matcha in the afternoon, and maybe a glimpse of the Kamo River at dusk — that's a proper Kyoto day. You've earned a good night's rest.",
    icon: "✨",
  },

  // ─── Osaka ────────────────────────────────────────────────────────────
  {
    id: "ds-6",
    key: "osaka:food-focused",
    content:
      "Your stomach did the heavy lifting today — and what a workout it was! Osaka's food scene doesn't disappoint. If you're not completely stuffed, the neon-lit Dotonbori strip comes alive after dark.",
    icon: "🌃",
  },
  {
    id: "ds-7",
    key: "osaka:cultural",
    content:
      "Osaka has a brasher, louder kind of culture than its Kyoto neighbor — castle grounds, bunraku theater, and neighborhood shrines with real character. Tonight the city lights up; enjoy the view.",
    icon: "🏯",
  },
  {
    id: "ds-8",
    key: "osaka:shopping",
    content:
      "From the covered arcades of Shinsaibashi to the quirky shops of Amerikamura, Osaka knows how to do retail therapy. Your shopping bags are full and so is your heart. Nice work today.",
    icon: "🛍️",
  },
  {
    id: "ds-9",
    key: "osaka:mixed",
    content:
      "Osaka is the city that wants you to laugh, eat, and come back for more. Whether you explored castles or crushed takoyaki, you did it the Osaka way. Rest easy tonight.",
    icon: "🐙",
  },

  // ─── Tokyo ────────────────────────────────────────────────────────────
  {
    id: "ds-10",
    key: "tokyo:cultural",
    content:
      "Tokyo's cultural layers run deep — ancient temples sit in the shadow of skyscrapers, and tradition breathes in the most unexpected corners. Let Asakusa's lanterns or Meiji Shrine's stillness linger in your mind tonight.",
    icon: "⛩️",
  },
  {
    id: "ds-11",
    key: "tokyo:food-focused",
    content:
      "From Michelin-starred counters to standing ramen bars under the train tracks, Tokyo might be the greatest food city on earth. Whatever you ate today, you chose well. Tomorrow brings more.",
    icon: "🍜",
  },
  {
    id: "ds-12",
    key: "tokyo:shopping",
    content:
      "Harajuku, Ginza, Akihabara, Shimokitazawa — every Tokyo neighborhood has its own shopping personality. Hopefully you found something you love (and your suitcase still closes). Good night!",
    icon: "🎁",
  },
  {
    id: "ds-13",
    key: "tokyo:nature",
    content:
      "It's easy to forget Tokyo has green spaces until you're standing in Shinjuku Gyoen or walking along the Meguro River. Nature in this city is a gift — and you found it today. Rest well.",
    icon: "🌸",
  },
  {
    id: "ds-14",
    key: "tokyo:mixed",
    content:
      "A day in Tokyo is like channel-surfing through a dozen different cities. The contrasts are what make it magic. You covered a lot of ground today — your feet know it. Sleep well.",
    icon: "🗼",
  },

  // ─── Nara ─────────────────────────────────────────────────────────────
  {
    id: "ds-15",
    key: "nara:cultural",
    content:
      "Nara was Japan's first permanent capital, and walking its temple grounds today, you could feel that weight of history. The Great Buddha has been watching over this valley for over a thousand years. What a privilege to visit.",
    icon: "🦌",
  },
  {
    id: "ds-16",
    key: "nara:nature",
    content:
      "Between the free-roaming deer, the ancient cedar forests, and the wide open park, Nara has a gentleness that's hard to find elsewhere. Let that peaceful feeling carry you into tonight.",
    icon: "🌿",
  },
  {
    id: "ds-17",
    key: "nara:mixed",
    content:
      "Deer, giant Buddhas, mochi, and mossy stone lanterns — Nara packs a lot of wonder into a small city. It's the kind of place that stays with you. Sweet dreams tonight.",
    icon: "🏮",
  },

  // ─── Kobe ─────────────────────────────────────────────────────────────
  {
    id: "ds-18",
    key: "kobe:food-focused",
    content:
      "Whether or not you had THE beef today, Kobe's food scene — from Chinatown buns to harbor-side bakeries — has a cosmopolitan charm all its own. The port city fed you well.",
    icon: "🥩",
  },
  {
    id: "ds-19",
    key: "kobe:cultural",
    content:
      "Kobe's history as a port of foreign exchange gives it a unique character — Kitano's Western houses, the mosque, the jazz clubs. It's Japan looking outward. A lovely day of exploring.",
    icon: "🎷",
  },
  {
    id: "ds-20",
    key: "kobe:nature",
    content:
      "Mountains behind you, the sea in front — Kobe's natural setting is stunning. Whether you hiked Rokko or strolled the waterfront, the views today were something special. Rest those legs.",
    icon: "🏔️",
  },

  // ─── Fukuoka ──────────────────────────────────────────────────────────
  {
    id: "ds-21",
    key: "fukuoka:food-focused",
    content:
      "Tonkotsu ramen at a yatai stall, mentaiko on rice, fresh fish from the morning market — Fukuoka is a food lover's paradise and you dove right in. If you have room, a late-night yatai visit is a Fukuoka rite of passage.",
    icon: "🍥",
  },
  {
    id: "ds-22",
    key: "fukuoka:cultural",
    content:
      "Fukuoka blends old castle town history with a modern, laid-back energy. From Kushida Shrine to the canal city waterways, there's culture here that doesn't take itself too seriously. A great day.",
    icon: "🎏",
  },
  {
    id: "ds-23",
    key: "fukuoka:mixed",
    content:
      "Fukuoka has the energy of a big city with the friendliness of a small town. Between the shrines, the shopping, and the incredible food, it probably won you over today. Sleep well — tomorrow has more in store.",
    icon: "🌅",
  },

  // ─── Kanazawa ─────────────────────────────────────────────────────────
  {
    id: "ds-24",
    key: "kanazawa:cultural",
    content:
      "Kenrokuen, the samurai district, gold-leaf everything — Kanazawa preserves Edo-era Japan with a pride and care that's deeply moving. This city doesn't rush, and neither should you tonight.",
    icon: "🍃",
  },
  {
    id: "ds-25",
    key: "kanazawa:food-focused",
    content:
      "Kanazawa's proximity to the Sea of Japan means the seafood here is extraordinary — Omicho Market alone is worth the trip. Hopefully you tried the uni or the nodoguro. Your taste buds will remember today.",
    icon: "🐟",
  },
  {
    id: "ds-26",
    key: "kanazawa:mixed",
    content:
      "Gold-leaf ice cream, samurai houses, one of Japan's most beautiful gardens, and some of the freshest sushi around — Kanazawa quietly delivers one of the best days you can have in Japan.",
    icon: "🏯",
  },

  // ─── Hiroshima ────────────────────────────────────────────────────────
  {
    id: "ds-27",
    key: "hiroshima:cultural",
    content:
      "Hiroshima carries the weight of history and the hope of peace with equal grace. The Peace Memorial Park is a place that changes you. Take a quiet moment tonight to reflect on what you saw today.",
    icon: "🕊️",
  },
  {
    id: "ds-28",
    key: "hiroshima:food-focused",
    content:
      "Hiroshima-style okonomiyaki with those layered noodles, fresh oysters from Miyajima — the food here has bold, hearty character, just like the city itself. You ate well today.",
    icon: "🥞",
  },
  {
    id: "ds-29",
    key: "hiroshima:mixed",
    content:
      "From the solemn beauty of the Peace Park to the lively okonomiyaki streets, Hiroshima holds contrasts with warmth. If you visited Miyajima too, the floating torii is probably still glowing in your memory.",
    icon: "⛩️",
  },

  // ─── Sapporo ──────────────────────────────────────────────────────────
  {
    id: "ds-30",
    key: "sapporo:food-focused",
    content:
      "Miso ramen, soup curry, fresh Hokkaido dairy, Genghis Khan lamb — Sapporo's food scene is comfort eating at its finest. The cold outside makes every warm bowl taste even better. What a day.",
    icon: "🍲",
  },
  {
    id: "ds-31",
    key: "sapporo:nature",
    content:
      "Hokkaido's vast landscapes make everything feel bigger and wilder. Whether it was mountain views, flower fields, or fresh northern air, Sapporo delivered the natural beauty today. Bundle up and rest well.",
    icon: "❄️",
  },

  // ─── Nagasaki ─────────────────────────────────────────────────────────
  {
    id: "ds-32",
    key: "nagasaki:cultural",
    content:
      "Nagasaki's layered history — Dutch traders, hidden Christians, the atomic aftermath — gives it a depth unlike anywhere else in Japan. The hilltop views at dusk are a perfect way to close this day.",
    icon: "🌄",
  },
  {
    id: "ds-33",
    key: "nagasaki:mixed",
    content:
      "Champon noodles, Glover Garden, the Peace Park, castella cake — Nagasaki weaves together so many threads of history and flavor. It's a city that lingers. Good night.",
    icon: "🕯️",
  },

  // ─── Hakone ───────────────────────────────────────────────────────────
  {
    id: "ds-34",
    key: "hakone:nature",
    content:
      "Hot springs, lake cruises, and if you were lucky, a clear view of Fuji-san — Hakone is the perfect escape from the city pace. Soak in an onsen tonight if you can. You've earned it.",
    icon: "♨️",
  },
  {
    id: "ds-35",
    key: "hakone:mixed",
    content:
      "Between the open-air museum, the ropeway over volcanic valleys, and the lakeside shrine, Hakone gave you a full day of variety. End the night with a long soak — it's what Hakone does best.",
    icon: "🗻",
  },

  // ─── Yokohama ─────────────────────────────────────────────────────────
  {
    id: "ds-36",
    key: "yokohama:food-focused",
    content:
      "Chinatown feasting, waterfront cafes, and the Cup Noodles Museum — Yokohama knows how to keep your appetite entertained. The harbor lights at night are a beautiful bonus. Sweet dreams.",
    icon: "🥟",
  },
  {
    id: "ds-37",
    key: "yokohama:mixed",
    content:
      "Yokohama has a breezy, international feel that sets it apart from nearby Tokyo. The bay, the red brick warehouses, the gardens — it's a city built for pleasant strolls. Well spent day.",
    icon: "🚢",
  },

  // ─── Sendai ───────────────────────────────────────────────────────────
  {
    id: "ds-38",
    key: "sendai:mixed",
    content:
      "The City of Trees lives up to its name — wide, leafy boulevards and a relaxed Tohoku warmth. Whether you explored Date Masamune's castle ruins or hit gyutan alley, Sendai showed you its best today.",
    icon: "🌳",
  },

  // ─── Matsuyama ────────────────────────────────────────────────────────
  {
    id: "ds-39",
    key: "matsuyama:mixed",
    content:
      "Dogo Onsen, one of Japan's oldest hot springs, and a hilltop castle with sweeping views — Matsuyama has a timeless, unhurried quality. Let the warm waters carry today's adventures away.",
    icon: "♨️",
  },

  // ─── Takamatsu ────────────────────────────────────────────────────────
  {
    id: "ds-40",
    key: "takamatsu:mixed",
    content:
      "Ritsurin Garden, udon straight from the source, and the Seto Inland Sea sparkling in the distance — Takamatsu is Shikoku at its most welcoming. A peaceful end to a peaceful day.",
    icon: "🍜",
  },

  // ─── Naha ─────────────────────────────────────────────────────────────
  {
    id: "ds-41",
    key: "naha:mixed",
    content:
      "Shuri Castle, Kokusai Street, and that unmistakable Okinawan energy — Naha feels like a different Japan, and that's exactly the point. The tropical breeze tonight is yours to enjoy.",
    icon: "🌺",
  },
  {
    id: "ds-42",
    key: "naha:nature",
    content:
      "Turquoise waters, coral reefs, and subtropical forests — Okinawa's natural beauty is in a league of its own. Let the sound of the ocean be your lullaby tonight.",
    icon: "🌊",
  },

  // ─── Generic (fallback for any city) ──────────────────────────────────
  {
    id: "ds-43",
    key: "generic:cultural",
    content:
      "Another day of history, landmarks, and quiet moments of awe. Japan's cultural heritage has a way of slowing you down in the best possible way. Let tonight be restful — tomorrow has more to show you.",
    icon: "🏛️",
  },
  {
    id: "ds-44",
    key: "generic:food-focused",
    content:
      "From the first bite to the last, today was a celebration of Japanese food. Every region has its own specialties, and you got to taste them firsthand. Your food memories from today will last a long time.",
    icon: "🍱",
  },
  {
    id: "ds-45",
    key: "generic:nature",
    content:
      "A day surrounded by nature in Japan hits differently. The attention to natural beauty here — from manicured gardens to wild mountain trails — is something special. Rest well tonight.",
    icon: "🌿",
  },
  {
    id: "ds-46",
    key: "generic:shopping",
    content:
      "Japanese craftsmanship, quirky souvenirs, department store basements full of beautiful food — shopping here is its own kind of cultural experience. Hope you found something wonderful today.",
    icon: "🎀",
  },
  {
    id: "ds-47",
    key: "generic:mixed",
    content:
      "A little bit of everything today — that's the beauty of traveling in Japan. Every turn brings something new, from ancient to ultra-modern. You're building memories that'll last. Good night.",
    icon: "🌟",
  },
  {
    id: "ds-48",
    key: "generic:any",
    content:
      "What a day. Japan has a way of surprising you, no matter how many times you visit. Whatever you saw, tasted, or discovered today, it was worth it. Rest up — tomorrow is waiting.",
    icon: "💫",
  },
];
