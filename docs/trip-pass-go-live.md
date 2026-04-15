# Trip Pass: Go-Live Checklist

Step-by-step guide to get the Yuku Trip Pass from the current feature branch to accepting real payments.

---

## Phase A: Stripe Account Setup

### 1. Create a Stripe account

Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign up. You'll need:

- Business name (Yuku Japan or your registered entity)
- Business address
- Bank account for payouts
- Tax ID (if you have one)

Stripe will let you use test mode immediately. Live mode requires identity verification which can take 1-2 business days.

### 2. Enable Stripe Tax

In the Stripe Dashboard:
1. Go to **Settings > Tax**
2. Enable automatic tax calculation
3. Set your business origin address (this determines nexus for US sales tax)
4. Stripe handles VAT/GST for international customers automatically

This is needed because the checkout route has `automatic_tax: { enabled: true }`.

### 3. Get your API keys

In the Stripe Dashboard, go to **Developers > API Keys**. You need three values:

| Key | Where to find it | Example format |
|-----|-------------------|---------------|
| Secret key | "Secret key" under Standard keys | `sk_test_...` (test) or `sk_live_...` (live) |
| Publishable key | "Publishable key" under Standard keys | `pk_test_...` (test) or `pk_live_...` (live) |
| Webhook signing secret | Created in step 4 below | `whsec_...` |

### 4. Register the webhook endpoint

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. URL: `https://yourdomain.com/api/billing/stripe-webhook`
4. Select these events:
   - `checkout.session.completed`
   - `charge.dispute.created`
   - `charge.refunded`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`) from the endpoint details page

---

## Phase B: Vercel Environment Variables

In the Vercel dashboard, go to your project > **Settings > Environment Variables**. Add these:

| Variable | Value | Environments |
|----------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` from Stripe | Production |
| `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe | Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step A4 | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` from Stripe | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` from Stripe | Preview, Development |
| `FREE_FULL_ACCESS` | `true` | (see note below) |

**About `FREE_FULL_ACCESS`:** Set this to `true` in Production for launch week if you want everyone to get full trips for free while you validate everything works. Remove it (or set to empty string) when you're ready to turn on payments.

**Already configured (verify these exist):**
- `RESEND_API_KEY` (for confirmation emails)
- `NEXT_PUBLIC_SITE_URL` (e.g., `https://yukujapan.com`)
- All existing Supabase, Google, Mapbox keys

---

## Phase C: Database Migration

The migration file is at `supabase/migrations/20260408000000_add_trip_pass_fields.sql`. It adds:

- 5 columns to the `trips` table (unlock state, Stripe session, tier, amount, refinement counter)
- `stripe_customer_id` column to `user_preferences`
- `launch_pricing` table (seeded with 300 slots)
- `trip_day_access_log` table (for refund exception checks)
- 2 RPC functions (`decrement_launch_slots`, `increment_free_refinements`)

### To apply:

**Option 1: Supabase CLI**
```bash
npx supabase db push
```

**Option 2: Supabase Dashboard**
1. Go to your Supabase project > **SQL Editor**
2. Paste the contents of the migration file
3. Click **Run**

**Option 3: Linked migrations**
If your Supabase project is linked:
```bash
npx supabase db push --linked
```

### Verify it worked:

In the Supabase SQL Editor, run:
```sql
-- Check trips table has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'trips' AND column_name IN ('unlocked_at', 'unlock_tier', 'stripe_session_id', 'unlock_amount_cents', 'free_refinements_used');

-- Check launch pricing is seeded
SELECT * FROM launch_pricing;

-- Should show: id='default', total_slots=100, remaining_slots=100
```

---

## Phase D: Email Setup

The confirmation email sends from `trips@yukujapan.com` via Resend.

### If Resend is already configured:

1. Verify `RESEND_API_KEY` is set in Vercel env vars
2. Verify `yukujapan.com` (or your domain) is verified in Resend dashboard
3. Add DNS records for `trips@yukujapan.com` if not already done:
   - SPF, DKIM, and DMARC records (Resend provides these)
4. Make sure the reply-to address forwards to an inbox you actually check

### If Resend is not set up yet:

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Add the DNS records Resend gives you
4. Get your API key and add it to Vercel as `RESEND_API_KEY`

If `RESEND_API_KEY` is not set, the email silently skips (the unlock still works, user just doesn't get a receipt email).

---

## Phase E: Merge and Deploy

### 1. Merge the branch

```bash
git checkout main
git merge feature/trip-pass-mvp
```

Or create a PR and merge via GitHub.

### 2. Deploy to Vercel

Push to main (or merge the PR). Vercel auto-deploys.

### 3. Verify the deployment

After deploy, check:

```bash
# Webhook endpoint is accessible (should return 400, not 404 or 401)
curl -X POST https://yourdomain.com/api/billing/stripe-webhook

# Checkout requires auth (should return 401)
curl -X POST https://yourdomain.com/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Phase F: Test End-to-End (Before Going Live)

### Test with Stripe test keys

Use your `sk_test_` / `pk_test_` keys. Stripe provides test card numbers:

| Card | Behavior |
|------|----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declines |
| `4000 0000 0000 3220` | Requires 3D Secure |

Any future expiry date, any 3-digit CVC, any billing ZIP.

### Test checklist

- [ ] Generate a multi-day trip. Verify Day 1 is full, Days 2+ are blurred.
- [ ] Click "Unlock for $XX". Verify Stripe Checkout opens with correct price and trip details.
- [ ] Complete payment with test card 4242. Verify:
  - Ceremony plays for ~12 seconds
  - All days unlock after ceremony
  - Dashboard badge changes to "Full trip unlocked"
  - Confirmation email arrives
- [ ] Generate another trip. Verify it's also locked (the Pass is per-trip, not per-account).
- [ ] Test refinement gating: refine Day 1 once (should work), try again (should prompt unlock).
- [ ] Test sharing: share a free trip, verify shared link shows Day 1 only.
- [ ] Test the override: set `FREE_FULL_ACCESS=true` locally, verify no paywall anywhere.

### Test webhook locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local dev server
stripe listen --forward-to localhost:3000/api/billing/stripe-webhook

# The CLI will print a webhook signing secret (whsec_...)
# Add it to .env.local as STRIPE_WEBHOOK_SECRET
```

---

## Phase G: Go Live

### 1. Switch to live Stripe keys

In Vercel, update Production environment variables:
- `STRIPE_SECRET_KEY` to `sk_live_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `pk_live_...`

### 2. Register live webhook

Repeat step A4 but with your production URL. Update `STRIPE_WEBHOOK_SECRET` in Vercel with the new signing secret.

### 3. Remove `FREE_FULL_ACCESS`

Delete or empty the `FREE_FULL_ACCESS` environment variable in Production. Redeploy.

### 4. Verify first real payment

Make a real purchase yourself with a real card. Verify:
- Payment appears in Stripe Dashboard
- Trip unlocks
- Email arrives
- Launch pricing counter decremented (check `launch_pricing` table)

### 5. Monitor

First week, watch:
- Stripe Dashboard for failed payments, disputes
- Server logs for webhook errors (`"Stripe webhook signature verification failed"`)
- `launch_pricing.remaining_slots` (when it hits 0, launch pricing ends automatically)
- Confirmation email delivery in Resend dashboard

---

## Quick Reference: Key Decisions

| Decision | What we chose | Why |
|----------|--------------|-----|
| Payment model | One-time per trip | Audience uses Yuku once, subscriptions don't fit |
| Price anchor | Trip expenses ($19-39) | Not SaaS ($5-15/mo) |
| Free tier | Day 1 complete | Proves quality before asking for money |
| Refund policy | All sales final | Digital goods with export; Day 1 is the preview |
| Launch pricing | $19 flat, first 300 | Real scarcity, not manufactured |
| Override toggle | Env var + Sanity dates | Hard kill switch + no-redeploy promotions |

---

## If Something Goes Wrong

**Paywall is broken, users can't unlock:**
Set `FREE_FULL_ACCESS=true` in Vercel and redeploy. Everyone gets full access while you debug.

**Webhook isn't firing:**
Check Stripe Dashboard > Developers > Webhooks > your endpoint. Look for failed deliveries. Common causes: wrong URL, wrong signing secret, endpoint not in `PUBLIC_API_ROUTES`.

**Ceremony hangs (never completes):**
The ceremony has a minimum 12s timer. If the generation promise rejects, it still completes (catches errors). If truly stuck, user can refresh. Unlock state is in the database, not client-side. On refresh, they'll see the unlocked trip.

**User paid but trip isn't unlocked:**
Check the `trips` table for `unlocked_at`. If null, the webhook and verify both missed. Manually set `unlocked_at = now()` in Supabase. Then investigate why both paths failed (check logs for the request ID).

**Launch pricing ran out unexpectedly:**
Check `launch_pricing.remaining_slots`. If someone called the RPC directly, the session ID guard should have prevented it (requires a valid-looking session ID). Reset with: `UPDATE launch_pricing SET remaining_slots = 300 WHERE id = 'default';`
