import type { TransitionTemplate } from "@/types/itineraryGuide";

/**
 * Transition templates shown between activities when the parent category changes.
 * Matched by key: "fromParent:toParent:city"
 *
 * Key dimensions:
 *   fromParent / toParent: culture, food, nature, shopping, view, any
 *   city: kyoto, osaka, tokyo, generic, any
 *
 * "any" acts as a wildcard for fallback matching.
 */
export const TRANSITION_TEMPLATES: TransitionTemplate[] = [
  // ─── culture → food ──────────────────────────────────────────────
  {
    id: "tr-1",
    key: "culture:food:kyoto",
    content:
      "After all that temple-hopping, you've earned a proper meal. Kyoto's food scene is as refined as its gardens — think delicate flavors and beautiful presentation.",
  },
  {
    id: "tr-2",
    key: "culture:food:osaka",
    content:
      "Time to refuel! Osaka takes its street food seriously — this city was literally nicknamed 'the nation's kitchen.'",
  },
  {
    id: "tr-3",
    key: "culture:food:tokyo",
    content:
      "You've soaked up the history — now let Tokyo feed you. Whether it's a tiny ramen counter or a department-store basement food hall, you're in for a treat.",
  },
  {
    id: "tr-4",
    key: "culture:food:generic",
    content:
      "All that walking and wondering works up an appetite. Lucky for you, there's something delicious waiting around the corner.",
  },
  {
    id: "tr-5",
    key: "culture:food:any",
    content:
      "Sightseeing for the soul, food for the body — time to switch gears and let your taste buds take over.",
  },

  // ─── food → culture ──────────────────────────────────────────────
  {
    id: "tr-6",
    key: "food:culture:kyoto",
    content:
      "Nicely fueled up. Kyoto rewards a slow pace, and the next stop is one of those places where you'll want to linger and take it all in.",
  },
  {
    id: "tr-7",
    key: "food:culture:osaka",
    content:
      "Belly full? Good. Osaka has a surprising depth of history beneath all the neon — let's go find some of it.",
  },
  {
    id: "tr-8",
    key: "food:culture:tokyo",
    content:
      "With a full stomach, you're ready to explore a different side of Tokyo. The next stop trades flavors for something a little more timeless.",
  },
  {
    id: "tr-9",
    key: "food:culture:any",
    content:
      "With a full stomach, you're ready to take in something for the mind. The next stop is a shift in pace — from flavors to history.",
  },

  // ─── culture → nature ────────────────────────────────────────────
  {
    id: "tr-10",
    key: "culture:nature:kyoto",
    content:
      "Kyoto blurs the line between culture and nature better than anywhere. The next spot trades architecture for the real thing — open sky and greenery.",
  },
  {
    id: "tr-11",
    key: "culture:nature:tokyo",
    content:
      "One of Tokyo's best tricks is hiding pockets of calm in the middle of the chaos. You're about to find one.",
  },
  {
    id: "tr-12",
    key: "culture:nature:any",
    content:
      "Time to trade the pavement for some fresh air. A bit of nature is the perfect reset after all that sightseeing.",
  },

  // ─── nature → food ───────────────────────────────────────────────
  {
    id: "tr-13",
    key: "nature:food:kyoto",
    content:
      "Nothing sharpens an appetite like a garden stroll. Kyoto knows this — that's why so many of its best restaurants sit right alongside its parks.",
  },
  {
    id: "tr-14",
    key: "nature:food:osaka",
    content:
      "Fresh air and a walk — now you're properly hungry. Osaka will happily fix that for you, and quickly.",
  },
  {
    id: "tr-15",
    key: "nature:food:any",
    content:
      "All that fresh air has done its job — you're ready to eat. Let's find somewhere good.",
  },

  // ─── nature → culture ────────────────────────────────────────────
  {
    id: "tr-16",
    key: "nature:culture:kyoto",
    content:
      "From one kind of beauty to another. In Kyoto, nature and culture are practically neighbors — sometimes they share the same address.",
  },
  {
    id: "tr-17",
    key: "nature:culture:any",
    content:
      "Feeling refreshed? Good — the next stop has a story to tell. A little nature goes a long way in getting you ready for it.",
  },

  // ─── culture → shopping ──────────────────────────────────────────
  {
    id: "tr-18",
    key: "culture:shopping:kyoto",
    content:
      "Kyoto's shopping streets are an experience in themselves — traditional crafts, pottery shops, and the occasional matcha soft serve to keep you going.",
  },
  {
    id: "tr-19",
    key: "culture:shopping:osaka",
    content:
      "From sightseeing to retail therapy — Osaka style. Think bustling arcades, quirky finds, and energy that never quits.",
  },
  {
    id: "tr-20",
    key: "culture:shopping:tokyo",
    content:
      "Tokyo's shopping districts are their own kind of cultural experience. Each neighborhood has a completely different vibe — you'll see what I mean.",
  },
  {
    id: "tr-21",
    key: "culture:shopping:any",
    content:
      "Ready to switch from sightseeing to browsing? Japan's shops are full of things you didn't know you needed until you saw them.",
  },

  // ─── shopping → food ─────────────────────────────────────────────
  {
    id: "tr-22",
    key: "shopping:food:osaka",
    content:
      "Shopping in Osaka always leads to eating — it's basically a law here. Drop the bags and grab a seat.",
  },
  {
    id: "tr-23",
    key: "shopping:food:tokyo",
    content:
      "Tokyo's food options near shopping areas are endless. Whether you want a quick bite or a proper sit-down, you'll find something perfect.",
  },
  {
    id: "tr-24",
    key: "shopping:food:any",
    content:
      "All that browsing calls for a food break. Good news — you're never far from something delicious in Japan.",
  },

  // ─── food → nature ───────────────────────────────────────────────
  {
    id: "tr-25",
    key: "food:nature:kyoto",
    content:
      "A post-meal walk through some greenery is the most Kyoto thing you can do. Let the food settle while the scenery does its thing.",
  },
  {
    id: "tr-26",
    key: "food:nature:any",
    content:
      "A gentle walk after a good meal — there's no better way to let everything settle. The next spot has just the right amount of calm.",
  },

  // ─── food → shopping ─────────────────────────────────────────────
  {
    id: "tr-27",
    key: "food:shopping:osaka",
    content:
      "Osaka's shopping streets are often right next to its food alleys — so this transition is practically built into the city.",
  },
  {
    id: "tr-28",
    key: "food:shopping:any",
    content:
      "Feeling energized after that meal? Perfect timing — the next stop is a great area to browse and pick up something memorable.",
  },

  // ─── nature → shopping ───────────────────────────────────────────
  {
    id: "tr-29",
    key: "nature:shopping:any",
    content:
      "From the tranquility of nature to a bit of retail energy. It's a nice contrast, and you might find some unique souvenirs along the way.",
  },

  // ─── shopping → culture ──────────────────────────────────────────
  {
    id: "tr-30",
    key: "shopping:culture:any",
    content:
      "Bags in hand, let's take a detour into something with a bit more history. The contrast is part of what makes Japan so interesting.",
  },

  // ─── shopping → nature ───────────────────────────────────────────
  {
    id: "tr-31",
    key: "shopping:nature:any",
    content:
      "After the bustle of shops and crowds, a bit of green space is the perfect palate cleanser. Let's slow down for a moment.",
  },

  // ─── view → food ─────────────────────────────────────────────────
  {
    id: "tr-32",
    key: "view:food:tokyo",
    content:
      "You've just seen Tokyo from above — now it's time to experience it at street level, starting with one of its best restaurants.",
  },
  {
    id: "tr-33",
    key: "view:food:any",
    content:
      "What a view. Now that the eyes have had their fill, let's give the taste buds a turn.",
  },

  // ─── culture → view ──────────────────────────────────────────────
  {
    id: "tr-34",
    key: "culture:view:kyoto",
    content:
      "Kyoto has a way of saving the best views for those who make the effort. This next spot is worth every step.",
  },
  {
    id: "tr-35",
    key: "culture:view:any",
    content:
      "From the details of history to the big picture — literally. The next stop gives you a view that puts everything in perspective.",
  },

  // ─── view → culture ──────────────────────────────────────────────
  {
    id: "tr-36",
    key: "view:culture:any",
    content:
      "With that panorama still fresh in your mind, the next stop brings you back down to earth — and into something with real depth.",
  },

  // ─── nature → view ───────────────────────────────────────────────
  {
    id: "tr-37",
    key: "nature:view:any",
    content:
      "You've been surrounded by nature — now it's time to step back and take in the bigger picture from a vantage point.",
  },

  // ─── view → nature ───────────────────────────────────────────────
  {
    id: "tr-38",
    key: "view:nature:any",
    content:
      "From a sweeping view to an immersive one. The next spot puts you right in the middle of the scenery instead of looking down at it.",
  },

  // ─── food → view ─────────────────────────────────────────────────
  {
    id: "tr-39",
    key: "food:view:any",
    content:
      "Full and happy? The next spot gives you a chance to sit back and enjoy a view that pairs nicely with that post-meal glow.",
  },

  // ─── food → food ─────────────────────────────────────────────────
  {
    id: "tr-40",
    key: "food:food:osaka",
    content:
      "Yes, more food. This is Osaka — pacing yourself is optional, but eating your way through the city is basically required.",
  },
  {
    id: "tr-41",
    key: "food:food:any",
    content:
      "Another food stop? Absolutely. Japan rewards the adventurous eater, and you've got room for one more — trust me.",
  },

  // ─── culture → culture ───────────────────────────────────────────
  {
    id: "tr-42",
    key: "culture:culture:kyoto",
    content:
      "Kyoto never runs out of cultural gems. Each one has its own personality — this next place feels completely different from the last.",
  },
  {
    id: "tr-43",
    key: "culture:culture:any",
    content:
      "One more cultural stop, but don't worry — it has a completely different feel from the last. Variety is the whole point.",
  },

  // ─── generic fallbacks ───────────────────────────────────────────
  {
    id: "tr-44",
    key: "any:any:generic",
    content:
      "Onward to the next stop. Part of the joy of traveling in Japan is how every turn brings something completely different.",
  },
  {
    id: "tr-45",
    key: "any:any:any",
    content:
      "On to the next one — each stop tells a different part of the story. Let's keep exploring.",
  },
];
