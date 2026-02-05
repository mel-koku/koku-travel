# Locations Requiring Manual Review

**Generated:** 2026-02-05

This document lists locations that could not be automatically fixed and require manual review.

## Summary

| Issue Type              | Count | Description                            |
| ----------------------- | ----- | -------------------------------------- |
| SHORT_INCOMPLETE_NAME   | 209   | Single-word names needing fuller names |
| GOOGLE_NAME_MISMATCH    | 209   | Names to verify against Google Places  |
| MISSING_OPERATING_HOURS | 277   | Missing hours for planning             |
| DUPLICATE_MANY          | 100   | Duplicate entries across cities        |
| NAME_ID_MISMATCH        | 91    | IDs don't match renamed locations      |
| MISSING_PLACE_ID        | 6     | No Google Place ID                     |
| GOOGLE_AIRPORT_MISMATCH | 4     | Wrong place_id (points to airport)     |
| ALL_CAPS_NAME           | 3     | Names in ALL CAPS                      |

**Total Issues:** 936 (down from 1,164 after automated fixes)

---

## Critical Issues (Fix Immediately)

These 4 locations have wrong `place_id` values pointing to airports:

| Location             | City     | Current place_id Issue                                     |
| -------------------- | -------- | ---------------------------------------------------------- |
| Japan Romantic       | Tokoname | Points to Chubu Centrair International Airport             |
| Kobe Marathon        | Kobe     | Points to Kobe Airport                                     |
| Narita International | Narita   | Points to Narita Airport (but location is not the airport) |
| Yuya &               | Toyota   | Points to an airport                                       |

**Action:** Clear the `place_id` field and re-enrich these locations.

---

## Duplicate Locations (36 sets)

These locations appear multiple times and need manual deduplication.

### Same Name, Different Cities (Expected)

Some duplicates are legitimate - same name exists in different cities:

| Name        | Cities                                              |
| ----------- | --------------------------------------------------- |
| Shiraito    | Karuizawa, Nikko, Itoshima (3 different waterfalls) |
| Shirahama   | Shimoda, Shirahama (2 different beaches)            |
| Tateyama    | Tateyama (Chubu), Nagasaki                          |
| Kiyomizu    | Ogi, Matsuyama                                      |
| Higashiyama | Nagoya, Aizuwakamatsu                               |

### Likely True Duplicates (Need Merge/Delete)

| Name                              | Entries | Action Needed                   |
| --------------------------------- | ------- | ------------------------------- |
| Akan-Mashu National Park          | 2       | Merge - same park               |
| Shiretoko National Park           | 2       | Merge - same park               |
| Daisetsuzan National Park         | 2       | Merge - same park               |
| Minoo Park                        | 2       | Merge - same city (Minoo/Minoh) |
| Shikoku Karst                     | 2       | Merge - same location           |
| Shimonada Station                 | 2       | Merge - same station            |
| Sazaedo Temple                    | 2       | Merge - same temple             |
| Nagoya City Science Museum        | 2       | Merge - same museum             |
| Fukui Prefectural Dinosaur Museum | 2       | Merge - same museum             |
| Mifuneyama Rakuen                 | 2       | Merge - same garden             |
| Nakagusuku Castle Ruins           | 2       | Merge - same castle             |

### Full Duplicate List

<details>
<summary>Click to expand all 36 duplicate sets</summary>

| Name                                        | Location IDs                                                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Senjojiki                                   | `senjojiki-chubu-776bc94c`, `senjojiki-chugoku-50ca49ed`, `senjojiki-1-000-tatami-straw-mats-grassland-chugoku-02759a66`, `senjojiki-kansai-338576bd` |
| Shiraito                                    | `shiraito-chubu-e850f4bd`, `shiraito-kanto-418d85ed`, `shiraito-kyushu-a2510d0e`                                                                      |
| Akan-Mashu National Park                    | `akan-mashu-national-park-hokkaido-114a0ec6`, `explore-akan-mashu-kanto-42e80b00`                                                                     |
| Akizuki Castle Ruins                        | `akizuki-castle-ruins-kyushu-ac371b36`, `akizuki-castle-ruins-kyushu-408f706f`                                                                        |
| Beppu City Traditional Bamboo Crafts Center | `beppu-city-traditional-bamboo-crafts-center-kyushu-d264f5f0`, `beppu-city-traditional-bamboo-crafts-center-kyushu-04ae8249`                          |
| Daisetsuzan National Park                   | `daisetsuzan-national-park-hokkaido-375a04a9`, `explore-daisetsuzan-kanto-291ebd08`                                                                   |
| Fukui Prefectural Dinosaur Museum           | `fukui-prefectural-dinosaur-museum-chubu-69a0d9c3`, `fukui-prefectural-dinosaur-museum-chubu-f9d2a699`                                                |
| Hajime                                      | `hajime-kansai-0dde23e4`, `hajime-kyushu-4ee4749c`                                                                                                    |
| Hasedera                                    | `hasedera-kansai-88c84cab`, `hasedera-kanto-397c33be`                                                                                                 |
| Higashiyama                                 | `higashiyama-chubu-0462a1c0`, `higashiyama-tohoku-e7aeefee`                                                                                           |
| Idemitsu                                    | `idemitsu-kanto-6eb99b1a`, `idemitsu-kyushu-82767290`                                                                                                 |
| Japan Romantic                              | `japan-romantic-chubu-90a66963`, `japan-romantic-kanto-325bf574`                                                                                      |
| Kabushima Shrine                            | `kabushima-shrine-tohoku-bb4c75d7`, `kabushima-shrine-tohoku-92fa2b3d`                                                                                |
| Kamo Aquarium                               | `kamo-aquarium-tohoku-d83edc1b`, `tsuruoka-city-kamo-aquarium-tohoku-35e33adc`                                                                        |
| Kawasaki                                    | `kawasaki-kansai-0ee63c52`, `kawasaki-kanto-3da8f5e8`                                                                                                 |
| Kirin Brewery                               | `kirin-brewery-kansai-2a68d082`, `kirin-brewery-kanto-a0fa7568`                                                                                       |
| Kiyomizu                                    | `kiyomizu-kyushu-3ca219a3`, `kiyomizu-shikoku-736115c7`                                                                                               |
| Mifuneyama Rakuen                           | `mifuneyama-rakuen-kyushu-83da0ca3`, `mifuneyama-rakuen-a-forest-where-gods-live-kyushu-1740cd26`                                                     |
| Minoo Park                                  | `minoo-park-kansai-72b5c31b`, `minoo-park-kanto-836f7d56`                                                                                             |
| Miyagawa                                    | `miyagawa-chubu-05e45827`, `miyagawa-kansai-06decb48`                                                                                                 |
| Motomachi                                   | `motomachi-kansai-9efba7bb`, `motomachi-kanto-c1ffc4f4`                                                                                               |
| Mount Ishizuchi                             | `mount-ishizuchi-shikoku-8d1512fe`, `mount-ishizuchi-shikoku-880b65c1`                                                                                |
| Nagahama                                    | `nagahama-kansai-db1c893b`, `nagahama-kyushu-e6e6d4a8`                                                                                                |
| Nagoya City Science Museum                  | `nagoya-city-science-museum-chubu-f054b17b`, `nagoya-city-science-museum-chubu-94e593c5`                                                              |
| Nakagusuku Castle Ruins                     | `nakagusuku-castle-ruins-okinawa-63c8aa82`, `nakagusuku-jo-site-nakagusuku-castle-ruins-okinawa-96873032`                                             |
| Nakamura                                    | `nakamura-chubu-1935f149`, `nakamura-shikoku-bb9304f5`                                                                                                |
| Ogamiyama Shrine Okunomiya                  | `ogamiyama-shrine-okunomiya-chugoku-b2cc5a30`, `ogamiyama-shrine-chugoku-40281937`                                                                    |
| Oki Islands                                 | `oki-islands-chubu-e7a15955`, `oki-islands-chugoku-a4a82e8a`                                                                                          |
| Okinoshima                                  | `okinoshima-kanto-a7084a6c`, `okinoshima-kyushu-3948bacf`                                                                                             |
| Ramen Sen no Kaze                           | `ramen-sen-no-kaze-hokkaido-d22c4f3e`, `ramen-sen-no-kaze-kansai-3f5bfa7b`                                                                            |
| Sapporo Beer Museum                         | `sapporo-beer-museum-hokkaido-1bc495ff`, `sapporo-beer-kanto-c408555f`                                                                                |
| Sazaedo Temple                              | `sazaedo-temple-tohoku-0539e793`, `sazaedo-temple-tohoku-520a510a`                                                                                    |
| Seki                                        | `seki-chubu-3fdb094d`, `seki-tohoku-80704c00`                                                                                                         |
| Shikoku Karst                               | `shikoku-karst-shikoku-51279def`, `shikoku-karst-shikoku-3aae4a66`                                                                                    |
| Shimonada Station                           | `shimonada-station-shikoku-ee793279`, `jr-shimonada-station-shikoku-d77a8ea3`                                                                         |
| Shirahama                                   | `shirahama-chubu-797731ef`, `shirahama-kansai-eba40190`                                                                                               |
| Shiretoko National Park                     | `explore-shiretoko-kanto-fb8facee`, `shiretoko-national-park-hokkaido-be82b0e1`                                                                       |
| Takayama Inari Shrine                       | `takayama-inari-shrine-tohoku-ea286ad4`, `takayama-inari-shrine-tohoku-b4bc4130`                                                                      |
| Tateyama                                    | `tateyama-chubu-25b79b9e`, `tateyama-kyushu-762cd884`                                                                                                 |
| Tsuruya                                     | `tsuruya-kanto-737f9dca`, `tsuruya-shikoku-16a33d1b`                                                                                                  |
| Tsushima Shrine                             | `the-owari-chubu-f41442d3`, `tsushima-shrine-shikoku-7e19c634`                                                                                        |
| Ueno Farm                                   | `ueno-farm-hokkaido-d5fdff7d`, `ueno-farm-kanto-23332028`                                                                                             |
| Ueno Park                                   | `ueno-park-chugoku-7b7f1b4d`, `ueno-park-kanto-12b612af`                                                                                              |
| Yaegaki Shrine                              | `yaegaki-shrine-fortune-telling-chugoku-cbf05d7d`, `yaegaki-shrine-chugoku-b920e52e`                                                                  |

</details>

---

## Short/Incomplete Names (209 remaining)

These locations have single-word names but couldn't be automatically fixed (either no `place_id` or Google returned the same name).

**Sample locations needing manual name lookup:**

| Current Name | City     | Category | Has Place ID |
| ------------ | -------- | -------- | ------------ |
| Abashiri     | Abashiri | culture  | Yes          |
| Arashiyama   | Kyoto    | landmark | Yes          |
| Kamakura     | Kamakura | culture  | Yes          |
| Hakodate     | Hakodate | culture  | Yes          |
| Naoshima     | Naoshima | culture  | Yes          |
| Shibuya      | Tokyo    | culture  | Yes          |
| Ginza        | Tokyo    | culture  | Yes          |

**Note:** Many of these are district/area names where Google Places returns the same single word. These may be intentionally brief.

---

## How to Fix

### 1. Critical Issues (Wrong Place ID)

```sql
-- Clear incorrect place_id
UPDATE locations
SET place_id = NULL,
    google_primary_type = NULL,
    google_types = NULL
WHERE id IN (
  'japan-romantic-chubu-90a66963',
  'kobe-marathon-kansai-1203dd0b',
  'narita-international-kanto-xxxxxxxx',
  'yuya-chubu-xxxxxxxx'
);
```

Then re-run enrichment or manually look up correct place_id.

### 2. Duplicates

Add resolutions to `scripts/data-quality/overrides.json`:

```json
{
  "duplicates": [
    {
      "keep": "akan-mashu-national-park-hokkaido-114a0ec6",
      "delete": ["explore-akan-mashu-kanto-42e80b00"],
      "reason": "Keeping entry with complete data"
    }
  ]
}
```

Then run: `npm run dq fix --type=DUPLICATE_MANY`

### 3. Short Names

Add name overrides to `scripts/data-quality/overrides.json`:

```json
{
  "names": {
    "abashiri-kanto-5ee299dd": "Abashiri Prison Museum"
  }
}
```

Then run: `npm run dq fix --type=SHORT_INCOMPLETE_NAME`

---

## Next Steps

1. **Immediate:** Fix 4 critical airport mismatch issues
2. **High Priority:** Resolve ~15 obvious duplicate pairs
3. **Medium Priority:** Review short names and decide which need fuller names
4. **Low Priority:** Add operating hours via Google Places enrichment
