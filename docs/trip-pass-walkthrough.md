# Yuku Trip Pass: How It Works

A walkthrough of the Trip Pass monetization system for Yuku Japan. Covers the complete user journey from free trip generation through payment and unlock.

---

## Overview

Yuku uses a one-time payment model called the **Yuku Trip Pass**. Users generate a trip for free and get Day 1 in full. Days 2 and beyond are locked behind a single payment. No subscription. No recurring billing.

**Pricing tiers (by trip length):**

| Trip Length | Price |
|---|---|
| 1-7 days (short trip) | $19 |
| 8-14 days (standard) | $29 |
| 15-21 days (extended) | $39 |

**Launch pricing:** The first 300 buyers get $19 flat regardless of trip length. Counter is real (tracked in DB), displayed when slots remain.

---

## Part 1: The Free Experience

### Step 1: Build a trip

The user goes through the 6-step trip builder as normal. On the final Review step, a single disclosure line appears below the heading:

> Your first day is free. Unlock your full itinerary for $29 after it's ready.

The price adjusts based on the trip length they chose. Nothing is blocked. They click "Build My Itinerary" as before.

### Step 2: Generation (what happens behind the scenes)

When the user clicks generate, the system builds the **complete itinerary for all days**: location scoring, city routing, travel times, activity scheduling. Day 1 is accurate in the context of the full trip (it knows what cities come next, how the pacing works across all days).

The difference: the AI-written prose (guide text and daily briefings) only generates for Day 1. Days 2+ get the full structure (activities, routes, times) but no editorial content. This saves roughly $0.02-0.03 per free trip that never converts.

### Step 3: What the user sees

**Day 1**: The complete editorial experience. Activities, transit directions, insider tips, guide prose, smart prompts. Everything works.

**Days 2+**: The day headers are visible (dates, cities, activity titles), but the content is blurred with a backdrop overlay. An "Unlock to see this day" button sits on top. The user can tell there's real content underneath, not a marketing shell.

**Day selector**: Lock icons appear next to Days 2+ in the dropdown.

**Dashboard**: Trip card shows a badge: "1 of 12 days unlocked."

### Step 4: The unlock card

Scrolling past Day 1, the user sees an editorial card between Day 1 and the blurred Day 2:

> **Your journey continues**
>
> Continue to Hakone, Kyoto, Nara, Osaka
>
> 11 more days of routes, transit, tips, and daily briefings.
>
> We plan each trip from scratch. The Pass covers the cost.
>
> [Unlock for $29]

The card names their actual cities, not a list of features. The cost transparency line sits between the feature summary and the CTA, explaining *why* there's a price without getting technical. If launch pricing slots remain, it shows: "Launch pricing: 47 of 100 Passes remaining at $19."

### Step 5: Tapping locked things

If a free user taps a blurred day, tries a second refinement, or tries to use day trips, PDF export, or full-trip sharing, a contextual prompt appears explaining what they're unlocking. Five variants with context-specific copy, each with "Unlock for $29" and "Not now."

### Step 6: One free refinement

Free users get one refinement on Day 1. The system tracks this per trip. If the refinement returns "no changes possible" (day is already full), it doesn't count against them. On the second attempt, they see: "Unlock your full trip to keep refining."

### Step 7: Sharing

Free users can share Day 1. The shared link shows Day 1 in full and stripped-down headers for other days. No detailed activity content for Days 2+.

---

## Part 2: The Unlock Flow

### Step 8: User clicks unlock

If the user isn't signed in, they're redirected to sign in first (Google OAuth). Then the system creates a Stripe Checkout session with their trip details. The browser redirects to Stripe's hosted checkout page showing:

> **Yuku Trip Pass**
>
> Your 12-day journey across Tokyo, Hakone, Kyoto, Nara, Osaka. Apr 2 - Apr 13.
>
> $29.00

Apple Pay, Google Pay, and Stripe Link appear automatically on supported devices.

### Step 9: Payment completes

Two parallel systems ensure the unlock sticks:

1. **Stripe webhook** fires to our server. Marks the trip as unlocked in the database, saves the Stripe customer ID (for future purchases), decrements launch pricing slots if applicable, and sends a confirmation email.

2. **Client-side verification**: When Stripe redirects the user back to the itinerary page, the app polls our verify endpoint which hits Stripe directly. If the webhook hasn't arrived yet, the verify endpoint marks the trip as unlocked. This is a safety net so the user never gets stuck waiting for a webhook.

### Step 10: The generation ceremony

After payment, the AI prose passes run for all remaining days. While this happens (~8-15 seconds), the user sees a full-screen editorial loading state:

> **Planning your journey.**
>
> Routing from Tokyo to Hakone...
>
> Optimizing your rail passes...
>
> Finding the morning light at Meiji Shrine...
>
> Writing your daily briefings...

Each line corresponds to real work happening. A progress bar fills underneath. There's a deliberate minimum of 12 seconds even if generation finishes faster. The intent: finishing too fast makes expensive work feel cheap.

### Step 11: Trip revealed

The loading state exits. All days are now fully accessible. Blur overlays disappear. Lock icons disappear. The dashboard badge changes to "Full trip unlocked." The user has the complete itinerary with prose, briefings, transit, and tips for every day.

### Step 12: Confirmation email

Arrives from trips@yukujapan.com:

> Your Yuku Trip Pass is confirmed.
>
> Tokyo, Hakone, Kyoto, Nara, Osaka Trip
> 12 days across Tokyo, Hakone, Kyoto, Nara, Osaka
> $29.00
>
> View your trip: [link]
>
> If your plans change or something isn't right, reply to this email.
>
> Safe travels,
> Yuku Japan

---

## Part 3: What Stays Free

| Feature | Free | Pass |
|---|---|---|
| Browse all places, guides, editorial content | Yes | Yes |
| Favorites and bookmarks | Yes | Yes |
| Complete the full trip builder | Yes | Yes |
| Day 1 itinerary (full content, prose, transit, tips) | Yes | Yes |
| Days 2+ itinerary | Blurred | Yes |
| Refinements on Day 1 | 1 per trip | Unlimited, all days |
| Share link | Day 1 only | Full trip |
| Travel Essentials, Before You Go, Packing | Yes | Yes |
| Before You Land (cultural briefing) | Yes | Yes |
| Ask Yuku chat (Q&A) | Unlimited | Unlimited |
| Day Trip Suggestions | No | Yes |
| PDF export | No | Yes |

---

## Part 4: The Override Toggle

Two ways to disable the paywall entirely:

### Option 1: Environment variable

Set `FREE_FULL_ACCESS=true` in Vercel environment variables and redeploy. Every trip generates fully: no deferred prose, no blur, no paywall touchpoints, unlimited refinements. Flip it off to restore normal behavior.

**Use for:** Launch week, press demos, emergency rollback.

### Option 2: Sanity date range

In Sanity Studio, set a start and end date on the "Free Access Window" field in Trip Builder Config. When the current date falls in the window, full access is enabled without a redeploy.

**Use for:** Golden Week promotions, seasonal free weeks, marketing campaigns.

When either is active, the app behaves as if every trip has a Pass. Trips generated during a free window keep their content after the window closes. No fake payment records are created.

---

## Part 5: Refund Policy

**All sales final once unlocked.** Stated in checkout. Appropriate for digital goods with exportable content.

**Narrow exceptions (handled manually):**
- Duplicate/double charge (technical error)
- Gemini outage during generation (technical failure)
- Days 2+ never viewed within 7 days of purchase

**Founding customer safety net:** First 500 buyers get no-questions-asked refunds on request. Not advertised. Honored when asked. Retired once the cap is hit.

**Chargebacks:** Auto-revoke the Pass. One calm email. Don't fight the dispute (a $29 chargeback isn't worth the $15 fee).

---

## Part 6: What's Not Built Yet

These are planned for later phases:

- **Post-trip email arc** (Phase 2): Three emails over two weeks. "Welcome home," Memory Book offer, referral ask. Then silence.
- **Memory Book** (Phase 3): $89 hardcover, print-on-demand. The physical object that creates word-of-mouth.
- **90-day access window enforcement**: The Pass is intended to be valid for 60 days before trip start through 30 days after trip end. Not yet enforced in code.
- **`buildTripPlan` tool gating**: The Ask Yuku chat tool that generates full trips should be Pass-only. Not yet gated.
- **Launch pricing display in the unlock card**: The DB counter works but the remaining-slots count isn't fetched client-side yet.

---

## Technical Summary

| Component | What it does |
|---|---|
| `src/lib/billing/types.ts` | Tier definitions, pricing constants |
| `src/lib/billing/access.ts` | Client-safe access checks (tier, price, day accessibility) |
| `src/lib/billing/accessServer.ts` | Server-only `isFullAccessEnabled()` (env var + Sanity window) |
| `src/lib/billing/stripe.ts` | Stripe checkout session creation, verification, webhook parsing |
| `src/lib/billing/email.ts` | Confirmation email via Resend |
| `POST /api/billing/checkout` | Creates Stripe checkout session |
| `POST /api/billing/stripe-webhook` | Handles Stripe events (unlock, disputes, refunds) |
| `GET /api/billing/verify` | Polling fallback for payment verification |
| `POST /api/billing/complete-generation` | Runs deferred AI prose after unlock |
| `UnlockCard.tsx` | Editorial CTA between Day 1 and Day 2 |
| `LockedDayOverlay.tsx` | Blur overlay for locked days |
| `UnlockCeremony.tsx` | 12-second loading state after payment |
| `ContextualUnlockPrompt.tsx` | Modal for tapping locked features |

**Branch:** `feature/trip-pass-mvp` (22 commits, not yet merged)

**To go live, you need:**
1. Stripe account with test/live keys configured in Vercel env vars
2. Database migration applied (`supabase db push`)
3. Stripe webhook endpoint registered pointing to `/api/billing/stripe-webhook`
4. Resend configured with a verified sending domain for confirmation emails
