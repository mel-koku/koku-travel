-- Tip audit fixes: region casing + invalid city remapping
-- Run: 2026-03-26

BEGIN;

-- ============================================================
-- 1. Fix region casing (3 tips)
-- Regions must be lowercase to match the system's KnownRegionId type
-- ============================================================

-- "Glassblowing in Otaru" — Hokkaido → hokkaido
UPDATE travel_guidance
SET regions = array_replace(regions, 'Hokkaido', 'hokkaido')
WHERE id = '488df756-b4c6-427b-b33f-4a7a331daf83';

-- "Kokeshi Doll Painting" — Tohoku → tohoku
UPDATE travel_guidance
SET regions = array_replace(regions, 'Tohoku', 'tohoku')
WHERE id = 'c76d6022-9cf7-4333-affc-22fdf0022fc8';

-- "Ryukyu Glass in Okinawa" — Okinawa → okinawa
UPDATE travel_guidance
SET regions = array_replace(regions, 'Okinawa', 'okinawa')
WHERE id = '666dd8b6-c097-491f-b5fe-019ec49be240';

-- ============================================================
-- 2. Remap non-KnownCityId cities to nearest valid planning city
--    (or switch to region-level targeting when no city is close)
-- ============================================================

-- uji → kyoto (Uji is 15 min south of Kyoto by train, functionally a suburb)
UPDATE travel_guidance SET cities = array_replace(cities, 'uji', 'kyoto')
WHERE 'uji' = ANY(cities);

-- matsumoto → nagano (same prefecture, common pairing for travelers)
UPDATE travel_guidance SET cities = array_replace(cities, 'matsumoto', 'nagano')
WHERE 'matsumoto' = ANY(cities);

-- shirakawa → takayama (Shirakawa-go is accessed from Takayama, most travelers base there)
UPDATE travel_guidance SET cities = array_replace(cities, 'shirakawa', 'takayama')
WHERE 'shirakawa' = ANY(cities);

-- yamanouchi → nagano (Jigokudani Snow Monkeys are a day trip from Nagano city)
UPDATE travel_guidance SET cities = array_replace(cities, 'yamanouchi', 'nagano')
WHERE 'yamanouchi' = ANY(cities);

-- ishinomaki → sendai (Tashirojima cat island is accessed from Ishinomaki, 45 min from Sendai)
UPDATE travel_guidance SET cities = array_replace(cities, 'ishinomaki', 'sendai')
WHERE 'ishinomaki' = ANY(cities);

-- kusatsu → drop city, add kanto region (Kusatsu Onsen is in Gunma, no nearby planning city)
UPDATE travel_guidance
SET cities = array_remove(cities, 'kusatsu'),
    regions = CASE
      WHEN NOT ('kanto' = ANY(regions)) THEN array_append(regions, 'kanto')
      ELSE regions
    END
WHERE 'kusatsu' = ANY(cities);

-- hitachinaka → drop city, add kanto region (Hitachi Seaside Park, day trip from Tokyo area)
UPDATE travel_guidance
SET cities = array_remove(cities, 'hitachinaka'),
    regions = CASE
      WHEN NOT ('kanto' = ANY(regions)) THEN array_append(regions, 'kanto')
      ELSE regions
    END
WHERE 'hitachinaka' = ANY(cities);

-- tanabe → drop city, add kansai region (Kumano Kodo gateway, deep Kii Peninsula)
UPDATE travel_guidance
SET cities = array_remove(cities, 'tanabe'),
    regions = CASE
      WHEN NOT ('kansai' = ANY(regions)) THEN array_append(regions, 'kansai')
      ELSE regions
    END
WHERE 'tanabe' = ANY(cities);

COMMIT;
