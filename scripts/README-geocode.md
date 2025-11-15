# Batch Geocoding Script

This script uses Google Places API to batch-process coordinates for all locations in the database.

## Prerequisites

1. **Google Places API Key**: You need a valid `GOOGLE_PLACES_API_KEY` environment variable
   - Get one from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the "Places API (New)" for your project
   - The first $200/month is free, which covers ~40,000 requests

## Usage

### Option 1: Using npm script (recommended)

```bash
npm run geocode:locations
```

### Option 2: Direct execution

```bash
npx tsx scripts/batch-geocode-locations.ts
```

### Option 3: With explicit API key

```bash
GOOGLE_PLACES_API_KEY=your_api_key_here npm run geocode:locations
```

## What the script does

1. **Reads all locations** from `src/data/mockLocations.ts`
2. **Identifies missing coordinates** - finds locations without coordinates
3. **Geocodes locations** - uses Google Places API to find coordinates
4. **Updates files**:
   - `src/data/mockLocations.ts` - adds coordinates to location objects
   - `src/data/locationCoordinates.ts` - updates lookup tables
   - `tmp/location-coordinates-updates.json` - generates a review file

## Output

The script will:
- Show progress for each location being geocoded
- Display statistics (successful, errors, etc.)
- Generate updated files automatically
- Create a JSON file with all updates for review

## Rate Limiting

The script includes a 200ms delay between requests to avoid hitting rate limits. For 183 locations, this takes approximately:
- **Time**: ~37 seconds (183 locations × 200ms)
- **API Cost**: ~$0.01 (well within free tier)

## Troubleshooting

### "Missing Google Places API key"
- Make sure `GOOGLE_PLACES_API_KEY` is set in your `.env.local` file
- Or export it before running: `export GOOGLE_PLACES_API_KEY=your_key`

### Some locations fail to geocode
- Check the error messages in the output
- Some locations might need more specific queries
- You can manually add coordinates for failed locations

### File update errors
- The script attempts to automatically update `mockLocations.ts`
- If it fails, check `tmp/location-coordinates-updates.json` for manual updates
- The `locationCoordinates.ts` file is always regenerated successfully

## Manual Updates

If automatic file updates fail, you can manually add coordinates using the format:

```typescript
{
  id: "location-id",
  name: "Location Name",
  // ... other fields
  coordinates: {
    lat: 35.1234,
    lng: 135.5678,
  },
}
```

## Next Steps

After running the script:
1. ✅ Verify `locationCoordinates.ts` looks correct
2. ✅ Check `mockLocations.ts` for added coordinates
3. ✅ Test the map functionality in your app
4. ✅ All locations should now show pins on the map!

