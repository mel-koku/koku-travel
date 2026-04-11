-- Update the default author for newly-created guides to reflect the Yuku Japan rename.
-- Existing rows that were created under the old default ('Koku Travel') are updated in place.

ALTER TABLE guides
  ALTER COLUMN author SET DEFAULT 'Yuku Japan';

UPDATE guides
  SET author = 'Yuku Japan'
  WHERE author = 'Koku Travel';
