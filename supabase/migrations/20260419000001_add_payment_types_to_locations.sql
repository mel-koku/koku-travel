-- Add payment_types column to locations for per-venue payment-acceptance badges.
-- Values: cash, ic_card, visa, mastercard, jcb, amex (initial vocab).
-- Future additions (apple_pay, paypay, etc.) welcome; derivation helper handles unknown values gracefully.
-- NULL = unknown (no pill rendered). Empty arrays rejected so unknown and "accepts nothing" never collide.

alter table public.locations
  add column if not exists payment_types text[];

alter table public.locations
  add constraint locations_payment_types_nonempty
  check (payment_types is null or array_length(payment_types, 1) > 0);

create index if not exists idx_locations_payment_types
  on public.locations using gin (payment_types)
  where payment_types is not null;

comment on column public.locations.payment_types is
  'Accepted payment methods. NULL = unknown (no pill rendered). Non-empty: cash, ic_card, visa, mastercard, jcb, amex, plus future additions (apple_pay, paypay, etc.). Empty arrays rejected by CHECK constraint.';
