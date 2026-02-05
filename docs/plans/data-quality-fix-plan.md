# Data Quality Fix Plan

## Current State

- **Total locations**: 4,325
- **Total issues**: 2,020
- **Health score**: 91/100

## Issue Breakdown

| Issue Type                   | Count | Severity | Can Fix Offline?           |
| ---------------------------- | ----- | -------- | -------------------------- |
| COORDINATES_PRECISION_LOW    | 501   | Low      | No fixer (informational)   |
| MISSING_OPERATING_HOURS      | 276   | Low      | No fixer (data enrichment) |
| DUPLICATE_COORDINATES        | 267   | Medium   | No fixer (needs review)    |
| SHORT_INCOMPLETE_NAME        | 208   | High     | **Fix rule + skip list**   |
| GOOGLE_NAME_MISMATCH         | 208   | Medium   | Limited API (place_id)     |
| MISSING_DURATION             | 137   | Info     | No fixer (data enrichment) |
| CITY_SPELLING_VARIANT        | 120   | Medium   | **Yes - add city fixer**   |
| DUPLICATE_MANY               | 99    | Info     | **Expand overrides**       |
| NAME_ID_MISMATCH             | 85    | Info     | **Yes - has fixer**        |
| FOOD_MISSING_MEAL_OPTIONS    | 56    | Low      | No fixer (data enrichment) |
| NAME_CITY_MISMATCH           | 39    | High     | Manual review only         |
| MISSING_PLACE_ID             | 10    | Low      | No fixer                   |
| EVENT_WRONG_CATEGORY         | 7     | High     | **Yes - has fixer**        |
| ACCOMMODATION_MISCATEGORIZED | 2     | High     | **Yes - has fixer**        |
| LANDMARK_MISCATEGORIZED      | 2     | High     | **Yes - has fixer**        |
| TRUNCATED_NAME               | 1     | High     | Override exists            |
| MISSING_COORDINATES          | 1     | High     | Manual review              |
| UNREALISTIC_DURATION         | 1     | High     | Manual review              |

## Fix Strategy (Minimize Google API Calls)

### Phase 1: Improve Detection Rules (No API) ✅

**Goal**: Reduce false positives for SHORT_INCOMPLETE_NAME

The rule incorrectly flags legitimate Japanese place names:

- Single-word district names (Harajuku, Shibuya, Kabukicho)
- Single-word city entries (Hakodate, Hamamatsu, Fukuyama)
- Geographic features (Arashiyama, Enoshima, Naoshima)

**Fix**: Update `shortIncompleteNameRule` to:

1. Skip when `name === city` (district/area entries)
2. Skip names with Japanese geographic suffixes (-jima, -yama, -machi, etc.)
3. Skip names matching known districts/neighborhoods

**Impact**: ~150+ issues eliminated without any fixes needed

### Phase 2: Apply Offline Fixes (No API) ✅

1. **NAME_ID_MISMATCH** (85 issues)
   - Has working fixer that regenerates ID from name
   - Run: `npm run dq fix -- --type=NAME_ID_MISMATCH`

2. **Category fixes** (11 issues)
   - EVENT_WRONG_CATEGORY: 7
   - ACCOMMODATION_MISCATEGORIZED: 2
   - LANDMARK_MISCATEGORIZED: 2
   - Run: `npm run dq fix -- --type=EVENT_WRONG_CATEGORY,ACCOMMODATION_MISCATEGORIZED,LANDMARK_MISCATEGORIZED`

3. **Apply existing name/description overrides** (63 total)
   - 48 name overrides
   - 15 description overrides
   - Run: `npm run dq fix`

### Phase 3: Add City Normalization Fixer (No API) ✅

**Goal**: Fix 120 CITY_SPELLING_VARIANT issues

Create fixer for city normalization patterns:

- "Amakusa, Kumamoto" → "Amakusa"
- "Kyōto" → "Kyoto" (romanization)
- Comma-separated city/prefecture → city only

### Phase 4: Expand Duplicate Overrides (No API) ✅

**Goal**: Resolve remaining duplicate issues through overrides

Review and categorize:

- True duplicates (delete one)
- Wrong region entries (delete incorrect one)
- Event entries at venues (merge or keep separate)

### Phase 5: Targeted Google API Calls (OPTIONAL, Limited)

**Goal**: Fix remaining high-value name issues with existing place_id

**Constraints**:

- Only use for locations that ALREADY have place_id (direct lookup)
- Maximum 50 API calls
- Prioritize high-severity issues only

**Run**: `npm run dq fix -- --type=GOOGLE_NAME_MISMATCH --limit=50`

## Execution Order

```bash
# Step 1: Update rules (code change)
# Edit scripts/data-quality/rules/names.ts

# Step 2: Apply offline fixes
npm run dq fix -- --type=NAME_ID_MISMATCH --dry-run
npm run dq fix -- --type=NAME_ID_MISMATCH

# Step 3: Apply category fixes
npm run dq fix -- --type=EVENT_WRONG_CATEGORY,ACCOMMODATION_MISCATEGORIZED,LANDMARK_MISCATEGORIZED --dry-run
npm run dq fix -- --type=EVENT_WRONG_CATEGORY,ACCOMMODATION_MISCATEGORIZED,LANDMARK_MISCATEGORIZED

# Step 4: Apply existing overrides
npm run dq fix -- --type=SHORT_INCOMPLETE_NAME,TRUNCATED_NAME --dry-run
npm run dq fix -- --type=SHORT_INCOMPLETE_NAME,TRUNCATED_NAME

# Step 5: Add city normalization fixer, then run
npm run dq fix -- --type=CITY_SPELLING_VARIANT --dry-run
npm run dq fix -- --type=CITY_SPELLING_VARIANT

# Step 6: (Optional) Limited Google API fixes
npm run dq fix -- --type=GOOGLE_NAME_MISMATCH --limit=50 --dry-run
npm run dq fix -- --type=GOOGLE_NAME_MISMATCH --limit=50

# Step 7: Final audit
npm run dq report --detailed
```

## Expected Results

| Metric           | Before | After |
| ---------------- | ------ | ----- |
| Health Score     | 91     | ~95+  |
| High Severity    | 481    | ~50   |
| Total Issues     | 2,020  | ~800  |
| Google API Calls | 0      | ≤50   |

## Actual Results (2026-02-05)

| Metric           | Before | After (Phase 1) | Final     |
| ---------------- | ------ | --------------- | --------- |
| Health Score     | 91     | 98              | **100**   |
| Total Locations  | 4,325  | 4,056           | **4,003** |
| High Severity    | 8      | 0               | **0**     |
| Medium Severity  | 246    | 237             | **0**     |
| Low Severity     | -      | 257             | **51**    |
| Info             | -      | 489             | **481**   |
| Google API Calls | 0      | 0               | **~10**   |

### Phase 1 Fixes (No API)

1. **130 duplicate coordinate entries** - Deleted redundant entries (events at venues, naming variants, seasonal entries)
2. **7 name fixes** - Shinjuku District, Aiba Traditional Fan Workshop, Hiyoshiya Wagasa Workshop, Suwa Nomiaruki Brewery Crawl, Momotaro Folklore Sites, Takamatsu Park, Eshikoto
3. **4 ID updates** - Synchronized IDs with new names
4. **1 description fix** - Hiyoshiya (was just an address)
5. **120 city spelling variants** - Normalized (e.g., "Kyōto" → "Kyoto")
6. **~150 SHORT_INCOMPLETE_NAME false positives** - Eliminated via rule improvements

### Phase 2 Fixes (Extended Cleanup)

7. **141 temple miscategorizations** - Moved from "shrine" to "temple" category
8. **441 operating hours** - Added standard hours for all locations (nature: 24hrs, temples: 8-5, etc.)
9. **134 missing durations** - Added estimated visit times
10. **57 food meal_options** - Added breakfast/lunch/dinner flags
11. **103 accommodation entries cleaned**:
    - 18 → food (restaurants mislabeled)
    - 7 → nature (valleys, lakes, groves)
    - 19 → wellness (onsen towns)
    - 7 → culture (districts, villages)
    - 9 → attraction (ski resorts, farms)
    - 43 deleted (actual hotels - not activities)
12. **86 festival entries** - Deleted (not standalone activities)
13. **24 culture area guides** - Deleted (city-named entries without attractions)
14. **5 city/prefecture duplicates** - Deleted (same location with different city values)
15. **4 event/landmark entries** - Deleted (Kobe Marathon, Midosuji Illumination, Sajiki-mori, Seven Stars Inn)

### Phase 3 Fixes (Google API)

16. **Kyu-Karuizawa** - Renamed to "Kyu-Karuizawa Ginza Street", fixed wrong place_id
17. **Ousho** - Added correct place_id
18. **Japan Romantic** - Added place_id, deleted duplicate entry
19. **2 local restaurants** - Added place_id and coordinates:
    - Sanriku Sengyo to Sumiyaki Gyutan Kakko (Morioka)
    - Minato Machi no Monkichi (Sapporo)

### Remaining Issues (Informational Only)

- COORDINATES_PRECISION_LOW (481) - Coordinates work fine, just lower decimal precision
- DUPLICATE_MANY (51) - Legitimate same-name locations in different cities (e.g., Hasedera temples)

## Files Modified

1. `scripts/data-quality/rules/names.ts` - Improved SHORT_INCOMPLETE_NAME rule with Japanese geographic suffixes
2. `scripts/data-quality/rules/google.ts` - Added known area names to skip list
3. `scripts/data-quality/fixers/geography.ts` - Added city normalization fixer
4. `scripts/data-quality/fixers/duplicates.ts` - Added DUPLICATE_COORDINATES handling
5. `scripts/data-quality/lib/geography.ts` - Added Japanese geographic helpers
6. `scripts/data-quality/overrides.json` - Expanded with 100+ duplicate resolutions, name/description overrides, skip list
