# How Koku Travel Generates Itineraries

A full explanation of how the app determines which locations to give the user, on what day, and in what order.

---

## 1. City Ordering — "Where does the traveler go first?"

`resolveCitySequence()` in `src/lib/routing/citySequence.ts` takes the user's selected cities, groups them by region, then runs **greedy nearest-neighbor** using a real inter-city travel time matrix (`src/lib/travelTime.ts`, covers all 17 `KnownCityId` cities with actual shinkansen/train times, haversine fallback for unknown pairs). The entry point (airport/station) determines the starting city. Days are allocated contiguously — all days in Kyoto before moving to Osaka — with earlier cities getting any remainder days.

**Example:** 7 days, [Kyoto, Osaka] → Kyoto ×4, Osaka ×3.

---

## 2. Location Selection — "What goes on day 3?"

For each day, the generator in `src/lib/itineraryGenerator.ts`:

1. **Filters** the city's location pool: removes already-used locations (by ID _and_ name), food categories (restaurants, food, cafes, bars — but **not** markets, which are treated as experience activities), geo-invalid locations, and seasonal-unavailable ones. Each generated day includes a computed **weekday** (from trip start date + day index) used for operating hours checks.

2. **Injects favorites first** — any hearted locations in this city are placed into **category-aware time slots** (bars/entertainment → evening, museums/shopping → afternoon, shrines/parks/markets → morning, overflow to next available slot when current exceeds 80% capacity), tagged `"favorite"`.

3. **Fills three time slots** (morning / afternoon / evening) with pace-adjusted capacity:

| Pace             | Morning (base 180 min) | Afternoon (base 300 min) | Evening (base 240 min) |
| ---------------- | ---------------------- | ------------------------ | ---------------------- |
| Relaxed (×0.65)  | 117 min                | 195 min                  | 156 min                |
| Balanced (×0.82) | 148 min                | 246 min                  | 197 min                |
| Fast (×0.92)     | 166 min                | 276 min                  | 221 min                |

- Interests cycle round-robin (e.g. culture → nature → shopping → culture...)
- Each candidate is **scored across 10 dimensions**, then the **top 5 are picked from randomly** (intentional variance so trips aren't identical)

---

## 3. Scoring — "Why _this_ location?"

`scoreLocation()` in `src/lib/scoring/locationScoring.ts` sums 10 weighted factors:

| Factor                     | Range       | What it rewards                                                                          |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| **Interest match**         | 0–30        | Category maps to user's selected vibes/interests                                         |
| **Rating quality**         | 0–25        | Google rating + review count tiers                                                       |
| **Logistical fit**         | -100 to +20 | Distance from last location (<1km best, >50km hard reject), duration fits available time |
| **Budget fit**             | 0–10        | Price level matches traveler budget                                                      |
| **Accessibility**          | 0–10        | Wheelchair options match traveler needs                                                  |
| **Category diversity**     | -5 to +5    | Bonus for new categories, -5 per consecutive repeat streak                               |
| **Neighborhood diversity** | -5 to +5    | Bonus for new area, penalty for same area 4+ times                                       |
| **Weather fit**            | -10 to +10  | Indoor boost on rainy days, outdoor boost on clear days                                  |
| **Time optimization**      | -8 to +10   | Viewpoints score high morning/evening, bars score high evening, museums afternoon        |
| **Group fit**              | -5 to +10   | Family → parks/museums, solo → temples, friends → restaurants/bars                       |

A **diversity filter** additionally blocks any pick that would create 3+ consecutive same-category activities.

---

## 4. Within-Day Ordering — "Why this sequence?"

After all days are filled, `optimizeItineraryRoutes()` in `src/lib/routeOptimizer.ts` reorders each day independently using **nearest-neighbor on haversine distance**. **Day 1** starts from the entry point (airport/station). **Days 2+** start from the **city center coordinates** (via `getCityCenterCoordinates` from `src/data/entryPoints.ts`), which better reflects a hotel-based starting position. The algorithm greedily picks the closest unvisited activity from the current position. If an end point is specified, the activity nearest to it is moved last. Note activities (non-place items) preserve their original relative positions.

---

## 5. Time Assignment — "When exactly?"

`planItinerary()` in `src/lib/itineraryPlanner.ts` walks the optimized sequence and assigns concrete times:

- Requests **walking routes** between all consecutive pairs, then **transit routes** for any >1km gaps
- Sequentially assigns arrival/departure times from **9:00 AM**, checking operating hours (bumps forward if not yet open). Generic "open every day" periods are no longer incorrectly skipped — only periods with an explicit day mismatch are filtered out.
- Adds **10-min transition buffers** between activities

---

## 6. Meals & Smart Prompts

Food locations (restaurants, food, cafes, bars) are **excluded** from auto-generation. Markets are **not** excluded — they are experience destinations (Nishiki, Tsukiji, Kuromon). After the itinerary is built, the **smart prompts** system (`/api/smart-prompts/recommend`) detects gaps and lets the user fill them interactively:

**Gap Detection** (`src/lib/smartPrompts/gapDetection.ts`):

- Missing meals — breakfast/lunch/dinner windows checked between activity times. Dinner is flagged whenever a day has activities but no dinner covered (not just when evening activities exist).
- Meal window logic checks whether a window (breakfast 7–9, lunch 12–14, dinner 18–21) falls _between_ the previous activity's end and the next activity's start.
- Light days, long gaps, late starts, early ends, category imbalance

**Action Types** (all implemented):
| Action | Behavior |
|--------|----------|
| `add_meal` | Fetch restaurants near gap, filtered by meal type + trip date's day-of-week for operating hours |
| `add_activity` | Fetch scored locations for the target time slot |
| `fill_long_gap` | Fetch non-food locations filtered by duration fit for the gap |
| `extend_day` | Fetch activities for the target time slot (morning/evening) |
| `diversify_categories` | Fetch locations matching suggested categories from the gap |
| `add_transport` | Return a note activity with transit info (no location fetch needed) |

**UX flow:** Click "Add" → preview card with recommendation details → "Add this", "Show another" (max 3), or filter chips (Cheaper, Closer, Indoor, Different cuisine) → confirm inserts activity. Quick meals (konbini) skip preview. Dismissed prompts persist in **localStorage** per trip (`koku:dismissed-prompts:{tripId}`).

The only exception to the food exclusion is favorited food spots, which pass through to the generator.

---

## 7. Day Trips

For small city selections (1–2 cities), the generator may suggest day trips when:

- Unused non-food locations in the base city drop below 15
- The traveler has been in the city long enough (e.g. 4+ days in Kyoto before suggesting Nara)
- Day trip count is below the cap (scales with trip length: 5d→1, 7d→2, 10d→3, 14d→4)

Day trip mappings (`src/data/dayTrips.ts`) cover all 17 `KnownCityId` cities — Kyoto, Osaka, Nara, Tokyo, Yokohama, Nagoya, Kanazawa, Fukuoka, Nagasaki, Hiroshima, Kobe, Sapporo, Hakodate, Sendai, Matsuyama, Takamatsu, and Naha.

---

## 8. Deduplication

Three layers prevent repeat locations:

- **By ID** — `usedLocations` Set tracks all used location IDs across the entire trip
- **By name** — `usedLocationNames` Set tracks normalized names to prevent same-name branches (e.g. multiple "Ichiran Ramen" entries)
- **Within-day** — `seenNamesInDay` Set deduplicates the available pool per day (handles DB entries like 7 "Tottori Sand Dunes" with different IDs)

---

## 9. Tips & Cultural Insights

There are **5 separate systems** that surface tips and cultural guidance to users. They come from different data sources, match differently, and render in different places.

### 9a. Guide Narrative (Static Templates)

**Source:** Curated TypeScript arrays — 52 cultural moment templates + 32 practical tip templates + 45 transition templates + 35+ day summary templates + day intro templates + trip overview templates in `src/data/guide/`.

`buildGuide()` in `src/lib/guide/guideBuilder.ts` weaves narrative segments between activities. For each day:

- **1 cultural moment** — matched by the activity's sub-category (shrine, temple, onsen, market, garden, museum, restaurant, **cafe**, **bar**) + city. Uses a fallback chain: `shrine:kyoto` → `shrine:any` → `any:kyoto` → `any:any`. Placed _before_ the relevant activity.
- **1 practical tip** — matched by mapping the activity category to a tip topic (e.g. shrine → "shrine-etiquette", restaurant → "dining-etiquette", market → "cash"). Placed _before_ the relevant activity.
- **Transitions** — between consecutive activities, `composeTransition()` first tries `matchTransition()` for **city+category-specific** rich transitions (45 templates), then falls back to generic bridge phrases.
- **Day summary** — `composeDaySummary()` computes the day's **vibe** (via `getDayVibe` — maps activity categories to vibes like "cultural", "nature", "food", "nightlife", "mixed") and tries vibe-specific templates first (e.g. `kyoto:cultural`), falling back to city-only or generic templates.

Selection within matches is **deterministic** — a hash of the day ID picks the same template every time for the same itinerary.

Season naming uses **"fall"** consistently (not "autumn") across all template keys and matchers.

### 9b. Proactive Guidance via Smart Prompts (Database)

**Source:** `travel_guidance` table in Supabase.

`detectGuidanceGaps()` in `src/lib/smartPrompts/gapDetection.ts` runs async after itinerary generation:

1. Extracts unique activity categories from the day
2. Calls `fetchDayGuidance()` with those categories + city + region + season
3. Filters to **etiquette + practical** types with **priority >= 7** only
4. Takes **max 2 per day**
5. Surfaces as sage-colored smart prompt cards with a **"Got it"** dismiss button

These are the **lowest priority** in the smart prompts list (behind meals, timing gaps, category balance), so they appear at the bottom of each day's suggestions.

### 9c. Day Tips Panel (Database)

**Source:** Same `travel_guidance` table, fetched independently.

The `DayTips` component renders a collapsible **"Travel Tips for Today"** accordion in each day header:

1. Extracts categories from all activities in the day
2. Resolves the actual **region name** from `day.cityId` (via `REGIONS` data, not passing cityId as region)
3. Calls `fetchDayGuidance()` with categories + city + region + season
4. Displays **top 5 tips** (title + summary) in an expandable panel

### 9d. Activity-Level Tips (Code Heuristics + Database)

**Source:** Code-based rules in `src/lib/tips/tipGenerator.ts` + optional location-specific DB tips.

For each activity, `generateActivityTipsAsync()` produces up to **3 tips** from two sources:

**Code-generated tips** (sync):

- Travel warnings (long transit, transfers)
- Reservation alerts (popular restaurants, attractions)
- Payment notes (cash-only categories, temple coin tips)
- Crowd timing (morning/afternoon for popular spots)
- Photo tips (golden hour for viewpoints, gardens)
- Weather adjustments (rain, temperature)
- Etiquette reminders (shrine, market, onsen)

**Database tips** (async):

- Fetches location-specific guidance matching the location's ID, category, city, and season
- Filtered to tips with matching `locationIds`
- Marked `isImportant` when priority >= 8

All tips are sorted by priority and capped at **3 per activity**.

### 9e. Ask Koku Chat (Database)

**Source:** Same `travel_guidance` table via `fetchMatchingGuidance()`.

The `getTravelTips` chat tool in `src/lib/chat/tools.ts` accepts category/city/region/season, queries the guidance table, and returns the **top 5 tips** as chat message text. This lets users ask cultural/etiquette questions conversationally.

### Guidance Matching — How the Database Scores Tips

`fetchMatchingGuidance()` in `src/lib/tips/guidanceService.ts` fetches all published guidance rows, then scores each:

| Match type        | Points            |
| ----------------- | ----------------- |
| Location ID match | +15               |
| Category match    | +10               |
| City match        | +5                |
| Season match      | +4 (mismatch: -5) |
| Region match      | +3                |
| Each tag match    | +2                |
| Base priority     | +1–10             |

Items scoring <= 0 are filtered out. Hard exclusion rules also apply: city-specific tips only show if the day's city matches, region-specific tips only show if the region matches.

### Summary Table

| Surface                | Data Source                                                                 | Matching                                   | Max Items                                              | UI                                  |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ----------------------------------- |
| **Guide narrative**    | Static templates (52 cultural + 32 practical + 45 transition + 35+ summary) | Sub-category + city + vibe, hash-picked    | 1 cultural + 1 practical + transitions + summary / day | Inline text between activities      |
| **Smart prompt cards** | `travel_guidance` DB                                                        | Category/city/region/season, priority >= 7 | 2 / day                                                | Sage cards, "Got it" dismiss        |
| **Day tips panel**     | `travel_guidance` DB                                                        | Category/city/region/season                | 5 / day                                                | Collapsible accordion in day header |
| **Activity tips**      | Code rules + DB location-specific                                           | Heuristics + location ID match             | 3 / activity                                           | Inline on activity cards            |
| **Ask Koku chat**      | `travel_guidance` DB                                                        | Category/city/region/season via tool call  | 5 / query                                              | Chat message text                   |

---

## 10. Post-Generation Validation

After generation, two validation passes run:

- **Domain validation** — flags days longer than 12 hours, budget overruns, nap-time conflicts for families with children
- **Quality validation** — flags duplicate locations, empty days, <2 activities/day, >50% same category, >3 consecutive same category/neighborhood

---

## Full Pipeline Summary

```
User submits trip (dates, cities, interests, pace, entry point, favorites)
    │
    ▼
POST /api/itinerary/plan
    │
    ▼
generateTripFromBuilderData()
    │
    ├──▶ fetchAllLocations(cities)        ← Supabase, filtered by cities
    │
    ├──▶ generateItinerary()              ← CORE ALGORITHM
    │     │
    │     ├──▶ resolveCitySequence()      ← Geographic ordering (17-city travel time matrix)
    │     ├──▶ expandCitySequenceForDays() ← Contiguous day allocation
    │     └──▶ For each day:
    │           ├── Compute weekday from trip start + day index
    │           ├── Filter locations (used, dedup, geo, no food except markets)
    │           ├── Add favorites (category-aware time slots)
    │           └── For each time slot (morning/afternoon/evening):
    │                 └── While time remains:
    │                       ├── pickLocationForTimeSlot()
    │                       │     ├── Pre-filter: opening hours (weekday-aware), seasonal
    │                       │     ├── scoreLocation() [10 dimensions]
    │                       │     ├── applyDiversityFilter() [-5/streak penalty]
    │                       │     └── Random pick from top 5
    │                       └── Subtract duration from remaining time
    │
    ├──▶ optimizeItineraryRoutes()         ← Nearest-neighbor per day
    │     │                                   Day 1: from entry point
    │     │                                   Days 2+: from city center
    │
    ├──▶ planItinerary()                   ← Concrete times + transit
    │
    ├──▶ generateDayIntros()               ← Gemini-powered day intros
    │
    ├──▶ buildGuide()                      ← Vibe-specific summaries, city transitions
    │
    └──▶ convertItineraryToTrip()          ← Final domain model

Post-generation (async, client-side):
    │
    ├──▶ detectGaps()                      ← Meal gaps, timing issues, category imbalance
    │
    └──▶ Smart prompt actions               ← add_meal, add_activity, fill_long_gap,
                                              extend_day, diversify_categories, add_transport
```

---

## Appendix: Shared Utilities

These functions are used throughout the itinerary pipeline. Each has a single canonical source — no duplicates.

| Function                                               | Source                             | Used by                                          |
| ------------------------------------------------------ | ---------------------------------- | ------------------------------------------------ |
| `calculateDistance(a, b)` → km                         | `src/lib/utils/geoUtils.ts`        | entryPoints, scoring                             |
| `calculateDistanceMeters(a, b)` → meters               | `src/lib/utils/geoUtils.ts`        | routeOptimizer, travelTime                       |
| `normalizeKey(str)` → lowercase trimmed                | `src/lib/utils/stringUtils.ts`     | itineraryGenerator, citySequence, geo/validation |
| `getCityCenterCoordinates(cityId)`                     | `src/data/entryPoints.ts`          | travelTime, itineraryEngine                      |
| `getSeason(month)` → "spring"/"summer"/"fall"/"winter" | `src/lib/guide/templateMatcher.ts` | guideBuilder, dayIntroGenerator                  |
