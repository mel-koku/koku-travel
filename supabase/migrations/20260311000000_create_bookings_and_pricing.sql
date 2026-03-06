-- Phase 3: Real Booking (free for now — no payment processing)
-- Adds bookings table for confirmed reservations and pricing_rules for display pricing.

-- Pricing rules: per-person or flat-rate pricing per experience/person
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  experience_slug TEXT,
  base_price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'JPY',
  per_person_price INTEGER,
  min_group INTEGER NOT NULL DEFAULT 1,
  max_group INTEGER NOT NULL DEFAULT 6,
  duration_minutes INTEGER,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pricing_rules_person_id_idx ON pricing_rules (person_id);
CREATE INDEX pricing_rules_experience_slug_idx ON pricing_rules (experience_slug) WHERE experience_slug IS NOT NULL;

-- Bookings: confirmed reservations
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES booking_inquiries(id) ON DELETE SET NULL,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  experience_slug TEXT,
  location_id TEXT,
  user_id UUID NOT NULL,

  booking_date DATE NOT NULL,
  session TEXT NOT NULL CHECK (session IN ('morning', 'afternoon')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  group_size INTEGER NOT NULL DEFAULT 1,
  interpreter_id UUID REFERENCES people(id) ON DELETE SET NULL,
  notes TEXT,

  total_price INTEGER,
  currency TEXT NOT NULL DEFAULT 'JPY',
  pricing_rule_id UUID REFERENCES pricing_rules(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent double-booking same person + date + session
CREATE UNIQUE INDEX bookings_person_date_session_unique
  ON bookings (person_id, booking_date, session)
  WHERE status = 'confirmed';

CREATE INDEX bookings_user_id_idx ON bookings (user_id);
CREATE INDEX bookings_person_id_idx ON bookings (person_id);
CREATE INDEX bookings_date_idx ON bookings (booking_date);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- Bookings: users see own, service role sees all
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on bookings"
  ON bookings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Pricing rules: public read, service role write
CREATE POLICY "Anyone can read pricing rules"
  ON pricing_rules FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on pricing_rules"
  ON pricing_rules FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
