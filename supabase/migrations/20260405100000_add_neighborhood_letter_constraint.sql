-- ⚠ ORDERING: Run scripts/fix-bad-neighborhoods.mjs --apply BEFORE pushing
-- this migration. The script nulls 1,625 existing junk rows. If the migration
-- is pushed first, it will fail because those rows violate the constraint.
--
-- Enforce that `locations.neighborhood`, when set, contains at least one
-- letter character. Prevents junk numeric values (Japanese chome/banchi block
-- numbers like "6" or "２") from being written by enrichment scripts.
--
-- Real neighborhood names in any script (Latin, hiragana, katakana, kanji)
-- always have at least one letter. Pure numerics are always wrong.
--
-- Context: an audit on 2026-04-05 found 1,625 of 5,986 (27%) neighborhood
-- rows were pure numeric, leaked from Google Places `sublocality_level_*`
-- address components. The bug was in extractNeighborhood() which trusted
-- whatever Google returned.
--
-- This constraint is cheap insurance — future scripts cannot re-introduce
-- the same bug even if they bypass the application code path.

-- Locale-independent check: after removing digits, whitespace, and common
-- Japanese/Latin punctuation, the result must be non-empty. Any string
-- containing a letter in any script (Latin, hiragana, katakana, kanji) will
-- have length > 0 after this scrub. Pure-numeric or punctuation-only values
-- will collapse to empty and fail the check.
--
-- This avoids depending on `[[:alpha:]]` which is locale-sensitive in Postgres
-- and not guaranteed to treat non-Latin letters as alpha characters on every
-- deployment.
ALTER TABLE locations
  ADD CONSTRAINT neighborhood_contains_letter
  CHECK (
    neighborhood IS NULL
    OR length(regexp_replace(neighborhood, '[[:space:][:digit:][:punct:]／（）]', '', 'g')) > 0
  );
