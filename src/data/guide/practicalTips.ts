import type { PracticalTipTemplate } from "@/types/itineraryGuide";

export const PRACTICAL_TIP_TEMPLATES: PracticalTipTemplate[] = [
  // ── IC Card (3 variants) ──────────────────────────────────────────────
  {
    id: "pt-1",
    key: "ic-card",
    content:
      "If you haven't already, grab a Suica or PASMO card — it works on trains, buses, and even convenience stores across Japan. You can charge it at any station kiosk. It'll save you from fumbling with coins at every ticket gate.",
    icon: "🚃",
  },
  {
    id: "pt-2",
    key: "ic-card",
    content:
      "Your IC card doubles as an electronic wallet at vending machines, konbini, and many restaurants. Just hold it over the reader and listen for the beep. Keep at least 1,000 yen loaded so you're never caught short on a bus.",
    icon: "💳",
  },
  {
    id: "pt-3",
    key: "ic-card",
    content:
      "Running low on your IC card? Look for the fare adjustment machines (called 'seisan-ki') near the ticket gates — they accept bills and coins. If you're on an iPhone, you can add a virtual Suica through Apple Wallet and top up with a credit card.",
    icon: "📱",
  },

  // ── Cash (3 variants) ─────────────────────────────────────────────────
  {
    id: "pt-4",
    key: "cash",
    content:
      "Japan is more cash-friendly than you might expect. Many smaller restaurants and temples only accept cash. 7-Eleven ATMs accept international cards and are everywhere — look for the '7-Bank' machines inside the store.",
    icon: "💴",
  },
  {
    id: "pt-5",
    key: "cash",
    content:
      "Keep a stash of 100-yen coins — you'll need them for temple offerings, coin lockers, and gachapon machines. Post offices also have international ATMs if you can't find a 7-Eleven nearby.",
    icon: "🪙",
  },
  {
    id: "pt-6",
    key: "cash",
    content:
      "Don't stress about carrying cash — Japan is incredibly safe, and people routinely carry tens of thousands of yen. That said, most 7-Eleven ATMs have a withdrawal limit around 100,000 yen per transaction. Withdraw what you need for a few days at a time.",
    icon: "🏧",
  },

  // ── Station Navigation (3 variants) ───────────────────────────────────
  {
    id: "pt-7",
    key: "station-navigation",
    content:
      "Big stations can feel like underground cities. Follow the colored lines on the floor or walls — each rail company has its own color. When in doubt, just follow the signs to your line's name, not the exit number.",
    icon: "🗺️",
  },
  {
    id: "pt-8",
    key: "station-navigation",
    content:
      "Most major stations have coin lockers near the ticket gates — perfect for stashing your bags while you explore. Sizes range from 300 to 700 yen. If the lockers are full, look for a baggage storage counter or use a luggage forwarding service.",
    icon: "🔐",
  },
  {
    id: "pt-9",
    key: "station-navigation",
    content:
      "Before you rush to the platform, check out the ekiben (station bento) shops — they sell beautifully packaged meal boxes designed to eat on the train. It's a quintessential part of Shinkansen travel. Grab one and a drink before you board.",
    icon: "🍱",
  },

  // ── Convenience Stores (3 variants) ───────────────────────────────────
  {
    id: "pt-10",
    key: "convenience-store",
    content:
      "Japanese konbini are a world apart from Western convenience stores. The onigiri (rice balls) are a perfect quick meal — look for the numbered pull-tab to unwrap the nori perfectly. Egg salad sandwiches and nikuman (steamed buns) are also reliably great.",
    icon: "🏪",
  },
  {
    id: "pt-11",
    key: "convenience-store",
    content:
      "Konbini aren't just for snacks — you can pay bills, print documents, buy event tickets, pick up online orders, and even ship luggage. The hot food counter near the register usually has fried chicken (karaage) and croquettes worth trying.",
    icon: "🍙",
  },
  {
    id: "pt-12",
    key: "convenience-store",
    content:
      "If you're looking for a quick breakfast, konbini coffee is surprisingly good and costs around 100-150 yen. Lawson, 7-Eleven, and FamilyMart all have self-serve machines. Pair it with a melon pan or tamago sando for a solid start to the day.",
    icon: "☕",
  },

  // ── Shrine Etiquette (3 variants) ─────────────────────────────────────
  {
    id: "pt-13",
    key: "shrine-etiquette",
    content:
      "At the temizuya (water basin) near the entrance, purify your hands before approaching the main hall. Use the ladle to pour water over your left hand, then right, then cup water in your left hand to rinse your mouth. Don't drink directly from the ladle.",
    icon: "⛩️",
  },
  {
    id: "pt-14",
    key: "shrine-etiquette",
    content:
      "The standard shrine prayer is: toss a coin (5 yen is lucky — 'go-en' sounds like 'good connection'), bow twice, clap twice, make your wish, then bow once more. It's fine to take your time; nobody will rush you.",
    icon: "🙏",
  },
  {
    id: "pt-15",
    key: "shrine-etiquette",
    content:
      "Walk along the sides of the sando (approach path) rather than the center, which is considered the gods' pathway. The torii gate marks the transition from the secular world to sacred space — a slight bow as you pass through is a nice touch.",
    icon: "🚶",
  },

  // ── Temple Etiquette (3 variants) ─────────────────────────────────────
  {
    id: "pt-16",
    key: "temple-etiquette",
    content:
      "If you're entering a temple building, shoes come off — look for the shelves or plastic bags provided at the entrance. Socks are fine and recommended, especially in winter when the wooden floors get cold.",
    icon: "🛕",
  },
  {
    id: "pt-17",
    key: "temple-etiquette",
    content:
      "At the incense burner outside the main hall, waft the smoke toward any part of your body you'd like to 'heal' — it's believed to have purifying properties. Head for wisdom, shoulders for strength. You'll see locals doing the same.",
    icon: "🪔",
  },
  {
    id: "pt-18",
    key: "temple-etiquette",
    content:
      "Photography rules vary by temple — interiors are often no-photo zones, while gardens and exteriors are usually fine. Look for signs with a camera icon. When in doubt, ask the staff. And please silence your phone before entering.",
    icon: "📷",
  },

  // ── Onsen Etiquette (3 variants) ──────────────────────────────────────
  {
    id: "pt-19",
    key: "onsen-etiquette",
    content:
      "The golden rule of onsen: wash thoroughly before getting into the bath. Use the shower stations provided and make sure all soap is rinsed off. The bath water is shared, so keeping it clean is essential. Your small towel stays out of the water.",
    icon: "♨️",
  },
  {
    id: "pt-20",
    key: "onsen-etiquette",
    content:
      "Most traditional onsen do not allow tattoos, but policies are slowly changing. Some offer private baths (kashikiri) as an alternative, and larger cities tend to be more lenient. It's worth calling ahead or checking their website to avoid disappointment.",
    icon: "🛁",
  },
  {
    id: "pt-21",
    key: "onsen-etiquette",
    content:
      "Don't bring your large towel into the bathing area — only the small hand towel. Most people fold it and place it on their head while soaking. Ease into the hot water slowly, especially at higher-temperature baths, and stay hydrated.",
    icon: "🧖",
  },

  // ── Dining Etiquette (3 variants) ─────────────────────────────────────
  {
    id: "pt-22",
    key: "dining-etiquette",
    content:
      "No tipping in Japan — really! It can actually be considered rude. When you receive the oshibori (hot towel), it's for your hands only. And don't forget to say 'gochisousama deshita' (thank you for the meal) when you leave.",
    icon: "🍽️",
  },
  {
    id: "pt-23",
    key: "dining-etiquette",
    content:
      "Many restaurants use ticket machines (shokkenki) at the entrance — insert money, select your dish from the buttons, and hand the ticket to the staff. Don't panic if it's all in Japanese; the top-left button is usually the house specialty.",
    icon: "🎫",
  },
  {
    id: "pt-24",
    key: "dining-etiquette",
    content:
      "It's perfectly fine to slurp noodles loudly in Japan — in fact, it's a sign you're enjoying the meal. When eating ramen, start with a sip of the broth, then the noodles. Lift the bowl to drink the soup; no spoon needed.",
    icon: "🍜",
  },

  // ── Tax-Free Shopping (2 variants) ────────────────────────────────────
  {
    id: "pt-25",
    key: "tax-free",
    content:
      "Foreign tourists can get the 10% consumption tax refunded on purchases over 5,000 yen at participating stores. Bring your passport — the shop will attach a record to it. Consumables (food, cosmetics) and general goods (electronics, clothing) can be combined to hit the threshold.",
    icon: "🛍️",
  },
  {
    id: "pt-26",
    key: "tax-free",
    content:
      "Tax-free items bought as consumables are sealed in a bag and technically shouldn't be opened until you leave Japan. In practice, customs rarely checks, but keep the sealed bag intact if you can. Department stores often have a dedicated tax-free counter on one floor.",
    icon: "🧾",
  },

  // ── Nightlife (2 variants) ────────────────────────────────────────────
  {
    id: "pt-27",
    key: "nightlife",
    content:
      "Last trains in most cities run between 11:30 PM and midnight — check your route in Google Maps or Navitime before settling into your second highball. If you miss it, taxis are safe but expensive; a manga cafe or capsule hotel makes a fun, affordable plan B.",
    icon: "🌙",
  },
  {
    id: "pt-28",
    key: "nightlife",
    content:
      "Many izakayas charge a small 'otoshi' (table charge) of 300-500 yen per person, which comes with a small appetizer — it's not a scam, it's standard practice. Order drinks first, food second. Sharing plates is the norm, so order a variety and pass them around.",
    icon: "🍺",
  },

  // ── Vending Machines (2 variants) ─────────────────────────────────────
  {
    id: "pt-29",
    key: "vending-machines",
    content:
      "Japan's vending machines are everywhere — even on remote mountain trails. In colder months, look for red-labeled cans marked 'あたたかい' (atatakai) for hot drinks. Green tea, corn soup in a can, and hot lemon are all worth trying.",
    icon: "🥤",
  },
  {
    id: "pt-30",
    key: "vending-machines",
    content:
      "Most vending machines accept IC cards and coins; some newer ones take QR payments too. Prices are standardized at around 130-160 yen for a drink, which is often cheaper than a convenience store. The Boss coffee cans are a beloved Japanese institution.",
    icon: "☕",
  },

  // ── Generic / Any (2 variants) ────────────────────────────────────────
  {
    id: "pt-31",
    key: "any",
    content:
      "If you need to ask for help, try 'sumimasen' (excuse me) — it's the magic word in Japan. Station staff, convenience store clerks, and even random passersby are often incredibly helpful. Many train stations also have English-speaking tourist info counters.",
    icon: "💡",
  },
  {
    id: "pt-32",
    key: "any",
    content:
      "Carry a small plastic bag for your trash — public bins are rare in Japan. You'll usually find bins at convenience stores and train stations, but during long walks or hikes, having your own bag is a lifesaver. Keeping things tidy is deeply valued here.",
    icon: "🗑️",
  },
  {
    id: "pt-33",
    key: "escalator",
    content:
      "Stand on the left side of escalators in Tokyo and most of Japan. In Osaka and Kyoto, stand on the right. Follow what locals ahead of you are doing if unsure. The walking side is always kept clear for people in a hurry.",
    icon: "🚶",
  },
  {
    id: "pt-34",
    key: "train-eating",
    content:
      "Eating on Shinkansen and long-distance express trains is perfectly fine — grab an ekiben and enjoy the view. On local and commuter trains, eating is frowned upon. Drinking water or tea quietly is acceptable on any train.",
    icon: "🚄",
  },

  // ── JR Pass (2 variants) ────────────────────────────────────────────
  {
    id: "pt-35",
    key: "jr-pass",
    content:
      "The Japan Rail Pass covers most JR lines including Shinkansen (except Nozomi and Mizuho). Activate it at a JR ticket office with your passport. A 7-day pass pays for itself with one Tokyo-Kyoto round trip.",
    icon: "🎫",
  },
  {
    id: "pt-36",
    key: "jr-pass",
    content:
      "Regional passes can be better value than the nationwide JR Pass. The Kansai Area Pass covers Kyoto-Osaka-Nara-Kobe. The Hokkaido Pass is essential for Sapporo-Hakodate routes. Check Jorudan or Hyperdia to compare.",
    icon: "🎫",
  },

  // ── Shoe Removal (2 variants) ───────────────────────────────────────
  {
    id: "pt-37",
    key: "shoe-removal",
    content:
      "Shoe removal is common in Japan: temples, ryokan, many restaurants with tatami, some museums, and all homes. Wear slip-on shoes and clean socks. Look for a raised entry (genkan) or shoe shelves as your cue.",
    icon: "👟",
  },
  {
    id: "pt-38",
    key: "shoe-removal",
    content:
      "When you remove your shoes, point them toward the exit (toes facing the door). Slippers provided inside are for hallways only. Remove them before stepping onto tatami. Toilet slippers stay in the bathroom.",
    icon: "👟",
  },
];
