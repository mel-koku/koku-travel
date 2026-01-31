# AI-Discovered Locations

This directory contains location data discovered by Claude via web search. The import script validates and seeds this data into the database.

## Workflow

1. Use Claude (with web search enabled) to discover locations
2. Save the JSON output to this directory
3. Run the import script to validate and seed to database

## Import Script Usage

```bash
# Import a single file
npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json

# Import all JSON files in this directory
npx tsx scripts/import-ai-locations.ts data/ai-discovered/ --all

# Dry run - validate without inserting
npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json --dry-run

# Enable coordinate proximity checking (catches renamed duplicates)
npx tsx scripts/import-ai-locations.ts data/ai-discovered/kansai-temples.json --check-proximity
```

## JSON Format

Each JSON file should contain an array of locations:

```json
[
  {
    "name": "Kinkaku-ji",
    "region": "Kansai",
    "city": "Kyoto",
    "prefecture": "Kyoto-fu",
    "neighborhood": "Kita-ku",
    "category": "culture",
    "coordinates": {
      "lat": 35.0394,
      "lng": 135.7292
    },
    "short_description": "Golden Pavilion, a Zen temple covered in gold leaf",
    "description": "Kinkaku-ji, officially named Rokuon-ji, is a Zen Buddhist temple in Kyoto. The top two floors are completely covered in gold leaf...",
    "estimated_duration": "1-2 hours",
    "rating": 4.6,
    "review_count": 15000,
    "min_budget": "¥500"
  }
]
```

### Required Fields

| Field         | Description                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| `name`        | Location name in English                                                          |
| `region`      | One of: Hokkaido, Tohoku, Kanto, Chubu, Kansai, Chugoku, Shikoku, Kyushu, Okinawa |
| `city`        | City name                                                                         |
| `category`    | Will be normalized to: culture, nature, food, shopping, attraction, hotel         |
| `coordinates` | Object with `lat` and `lng` (must be within Japan bounds)                         |

### Optional Fields

| Field                | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `neighborhood`       | District within the city (e.g., "Gion", "Arashiyama")  |
| `prefecture`         | Prefecture name (e.g., "Kyoto-fu", "Osaka-fu")         |
| `short_description`  | 1-2 sentence description                               |
| `description`        | Longer 2-3 paragraph description                       |
| `estimated_duration` | How long to spend (e.g., "1-2 hours")                  |
| `rating`             | Rating from 0-5                                        |
| `review_count`       | Number of reviews                                      |
| `min_budget`         | Cost (e.g., "Free", "¥500", "¥1000")                   |
| `is_seasonal`        | Boolean for seasonal locations                         |
| `seasonal_type`      | "festival", "seasonal_attraction", or "winter_closure" |
| `seasonal_months`    | When available (e.g., "March-April")                   |

## Claude Prompts

### Comprehensive Discovery Prompt

```
Search the internet for tourist attractions in [REGION], Japan. Find 15-20 locations across these categories: temples, shrines, parks, restaurants, shopping areas, museums, nature spots.

For each location, search for and provide this exact JSON structure:
{
  "name": "Location name in English",
  "region": "[REGION]",
  "city": "City name",
  "prefecture": "Prefecture name (e.g., Kyoto-fu, Osaka-fu)",
  "neighborhood": "District/area (e.g., Gion, Arashiyama)",
  "category": "culture|nature|food|shopping|attraction",
  "coordinates": { "lat": 00.0000, "lng": 000.0000 },
  "short_description": "1-2 sentence description for travelers",
  "description": "Longer 2-3 paragraph description with history and highlights",
  "estimated_duration": "1-2 hours",
  "rating": 4.5,
  "review_count": 1500,
  "min_budget": "Free|¥500|¥1000|etc"
}

IMPORTANT:
- Verify coordinates are accurate by cross-referencing multiple sources
- Include both famous attractions AND hidden gems
- Ensure category matches: culture (temples, shrines, museums, castles), nature (parks, gardens, mountains), food (restaurants, markets), shopping, attraction (theme parks, landmarks)

Output as a JSON array.
```

### Seasonal/Festival Discovery Prompt

```
Search for seasonal festivals, events, and seasonal attractions in [REGION], Japan. Include:
- Cherry blossom viewing spots (late March - early April)
- Autumn foliage locations (November)
- Annual festivals with specific dates
- Seasonal illuminations

For each, provide:
{
  "name": "Event/location name",
  "region": "[REGION]",
  "city": "City",
  "prefecture": "Prefecture",
  "category": "culture",
  "coordinates": { "lat": 00.0000, "lng": 000.0000 },
  "short_description": "Brief description",
  "is_seasonal": true,
  "seasonal_type": "festival|seasonal_attraction",
  "seasonal_months": "March-April"
}

Output as a JSON array.
```

### Restaurant/Food Discovery Prompt

```
Search for notable restaurants and food experiences in [CITY], Japan. Find 10-15 places including:
- Local specialty restaurants
- Famous ramen/sushi/tempura shops
- Food markets and street food areas
- Traditional dining experiences (kaiseki, izakaya)

For each, provide:
{
  "name": "Restaurant name in English",
  "region": "[REGION]",
  "city": "[CITY]",
  "neighborhood": "District",
  "category": "food",
  "coordinates": { "lat": 00.0000, "lng": 000.0000 },
  "short_description": "Specialty and what it's known for",
  "estimated_duration": "1-1.5 hours",
  "rating": 4.3,
  "min_budget": "¥1500"
}

Output as a JSON array.
```

### Hidden Gems Prompt

```
Search for lesser-known, off-the-beaten-path attractions in [REGION], Japan that tourists often miss. Find 10-15 hidden gems including:
- Small neighborhood shrines and temples
- Local parks and gardens
- Traditional craft workshops
- Scenic viewpoints
- Local markets

For each, provide:
{
  "name": "Location name in English",
  "region": "[REGION]",
  "city": "City name",
  "neighborhood": "District",
  "category": "culture|nature|food|shopping|attraction",
  "coordinates": { "lat": 00.0000, "lng": 000.0000 },
  "short_description": "Why this is a hidden gem",
  "estimated_duration": "30 minutes - 1 hour",
  "min_budget": "Free|¥500"
}

Output as a JSON array.
```

## Category Mapping

The import script normalizes categories automatically:

| Input Keywords                                       | Normalized To |
| ---------------------------------------------------- | ------------- |
| temple, shrine, museum, castle, historical, cultural | `culture`     |
| park, garden, mountain, beach, lake, onsen, hiking   | `nature`      |
| restaurant, ramen, sushi, cafe, izakaya, market      | `food`        |
| shopping, mall, store, retail                        | `shopping`    |
| attraction, theme park, zoo, aquarium, landmark      | `attraction`  |
| hotel, ryokan, accommodation, resort                 | `hotel`       |

## Deduplication

The import script automatically detects duplicates:

1. **Name + Region match**: Locations with the same normalized name in the same region are skipped
2. **Coordinate proximity** (with `--check-proximity`): Locations within 100m of existing entries are skipped

## Verification

After importing, verify your data:

```bash
# Check the locations in database
npx supabase db query "SELECT name, region, city, category FROM locations WHERE seed_source = 'ai_discovered' ORDER BY created_at DESC LIMIT 20"
```
