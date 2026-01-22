# Koku Travel - Product Requirements Document

**Version:** 1.0
**Date:** January 2026
**Status:** Active Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack](#2-tech-stack)
3. [Core User Flows](#3-core-user-flows)
4. [Functional Requirements](#4-functional-requirements)

---

## 1. Executive Summary

### 1.1 Product Overview

Koku Travel is a comprehensive Japan travel planning web application designed to transform how travelers discover, plan, and organize trips to Japan. The platform combines curated location data, intelligent itinerary generation, and interactive visualization tools to create personalized travel experiences.

### 1.2 Problem Statement

Planning a trip to Japan presents unique challenges:
- Overwhelming number of destinations and experiences to choose from
- Difficulty understanding optimal routing between locations
- Complex logistics involving multiple cities, regions, and transit options
- Limited tools that cater specifically to Japan travel nuances (operating hours, transit modes, regional specialties)

### 1.3 Solution

Koku Travel addresses these challenges by providing:
- **Curated Location Database**: 1,000+ handpicked locations across Japan with detailed information including operating hours, accessibility, budget estimates, and recommended visit times
- **Intelligent Trip Builder**: A guided 5-step wizard that captures traveler preferences (interests, pace, budget, accessibility needs) to generate personalized itineraries
- **Interactive Itinerary Editor**: Drag-and-drop interface with real-time map visualization, travel time calculations, and easy activity management
- **Cloud Synchronization**: Seamless sync between devices for logged-in users while supporting full guest access with local storage

### 1.4 Target Users

| User Segment | Description |
|--------------|-------------|
| First-Time Japan Visitors | Travelers seeking guidance on must-see destinations and practical logistics |
| Repeat Visitors | Experienced travelers looking to explore beyond major tourist areas |
| Group Trip Planners | Users organizing trips for families, friends, or couples |
| Accessibility-Conscious Travelers | Users with mobility requirements needing wheelchair-friendly options |

### 1.5 Key Metrics

- Number of locations in database: 1,000+
- Supported Japanese regions: 8 (Kanto, Kansai, Hokkaido, Tohoku, Chubu, Chugoku, Shikoku, Kyushu/Okinawa)
- Trip duration support: 1-14 days
- Interest categories: 8 (Culture, Food, Nature, Shopping, Photography, Nightlife, Wellness, History)

---

## 2. Tech Stack

### 2.1 Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 15 | React framework with App Router, server components, and API routes |
| **Language** | TypeScript | 5.x | Type-safe JavaScript with strict mode enabled |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework for responsive design |
| **Database** | Supabase (PostgreSQL) | Latest | Backend-as-a-Service with auth, real-time, and row-level security |
| **Maps** | Mapbox GL JS | Latest | Interactive map visualization and routing |
| **Testing** | Vitest | 3.2 | Fast unit testing framework |

### 2.2 Key Libraries & Dependencies

| Category | Library | Purpose |
|----------|---------|---------|
| **Authentication** | @supabase/ssr, @supabase/supabase-js | Server-side auth and database client |
| **Forms** | React Hook Form | Performant form state management |
| **Validation** | Zod | Runtime schema validation |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable | Accessible drag-and-drop interactions |
| **Rate Limiting** | @upstash/ratelimit, @upstash/redis | Redis-backed API rate limiting |
| **Date Handling** | date-fns | Date manipulation utilities |
| **Icons** | lucide-react | Modern icon library |

### 2.3 Infrastructure

| Component | Service | Purpose |
|-----------|---------|---------|
| **Hosting** | Vercel | Next.js-optimized serverless deployment |
| **Database** | Supabase Cloud | Managed PostgreSQL with built-in auth |
| **CDN** | Vercel Edge Network | Global content delivery |
| **Rate Limit Store** | Upstash Redis | Serverless Redis for rate limiting |
| **Routing APIs** | Mapbox Directions, Google Routes | Travel time and route calculations |

### 2.4 Development Tools

```
Build & Dev:     Next.js CLI, npm scripts
Linting:         ESLint with Next.js config
Type Checking:   TypeScript strict mode
Testing:         Vitest with jsdom environment
Database:        Supabase CLI for migrations
Performance:     Web Vitals monitoring
```

### 2.5 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App Router (React Server Components + Client Components)│
│  ├── Pages: Landing, Explore, Trip Builder, Itinerary, Dashboard│
│  ├── State: AppState Context, TripBuilder Context, Wishlist     │
│  └── Components: Features (explore, itinerary, trip-builder)    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/locations    - Paginated location search                  │
│  /api/cities       - City listing with counts                   │
│  /api/places       - Google Places integration                  │
│  /api/health       - Health check endpoint                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
├─────────────────────────────────────────────────────────────────┤
│  Auth:      Magic link (email OTP), OAuth                       │
│  Database:  locations, favorites, profiles, guide_bookmarks    │
│  RLS:       Row-level security for user data                    │
│  Cache:     place_details (Google Places responses)             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│  Mapbox:    Maps, routing, turn-by-turn directions              │
│  Google:    Places API for location details                     │
│  Upstash:   Redis for rate limiting                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core User Flows

### 3.1 Guest Exploration Flow

```
┌──────────────┐    ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│   Landing    │───▶│   Explore   │───▶│  Location Detail │───▶│  Add to     │
│    Page      │    │    Page     │    │      Modal       │    │  Favorites  │
└──────────────┘    └─────────────┘    └──────────────────┘    └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   Filter    │
                    │  By Region, │
                    │  Category,  │
                    │   Budget    │
                    └─────────────┘
```

**Steps:**
1. User lands on homepage and clicks "Explore Destinations" or navigates to `/explore`
2. User browses location grid with default "Featured" view
3. User applies filters: region (e.g., Kansai), category (e.g., Temples & Shrines), budget level
4. User searches by location name in search bar
5. User clicks a location card to open detail modal
6. Modal displays: photos, description, reviews, operating hours, accessibility info
7. User clicks heart icon to save location to favorites (stored in localStorage for guests)

---

### 3.2 Trip Creation Flow (Trip Builder Wizard)

```
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────────┐   ┌────────┐   ┌───────────┐
│ Step 1  │──▶│  Step 2  │──▶│  Step 3  │──▶│   Step 4    │──▶│ Step 5 │──▶│ Itinerary │
│ Basics  │   │ Regions  │   │ Interests│   │ Preferences │   │ Review │   │   View    │
└─────────┘   └──────────┘   └──────────┘   └─────────────┘   └────────┘   └───────────┘
```

**Step 1 - Basic Information:**
- Select trip duration (1-14 days)
- Choose travel dates (optional)
- Select entry point (airport or city)

**Step 2 - Regions & Cities:**
- Select regions to visit (multi-select)
- Choose specific cities within regions
- View city preview images and location counts

**Step 3 - Interests:**
- Select up to 5 interest categories
- Categories: Culture, Food, Nature, Shopping, Photography, Nightlife, Wellness, History

**Step 4 - Preferences:**
- Travel pace: Relaxed / Balanced / Fast-paced
- Budget level: Budget / Moderate / Premium
- Group type: Solo / Couple / Family / Friends
- Accessibility requirements (wheelchair-friendly)
- Dietary restrictions
- Weather preferences

**Step 5 - Review & Create:**
- Review all selections
- Name the trip
- Click "Create Itinerary" to generate

**Post-Creation:**
- System generates day-by-day itinerary based on preferences
- User redirected to itinerary view for editing

---

### 3.3 Itinerary Editing Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                         ITINERARY VIEW                                 │
├───────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌───────────────────────────────────────┐ │
│  │    DAY TIMELINE     │    │              MAP VIEW                  │ │
│  │  ┌───────────────┐  │    │                                       │ │
│  │  │  Day Selector │  │    │    ┌─────┐                            │ │
│  │  └───────────────┘  │    │    │  1  │  Activity Markers          │ │
│  │  ┌───────────────┐  │    │    └─────┘                            │ │
│  │  │ Activity 1    │◀─┼────┼───────────▶ Routes Between            │ │
│  │  │ [Drag Handle] │  │    │           Activities                  │ │
│  │  └───────────────┘  │    │    ┌─────┐                            │ │
│  │  ┌───────────────┐  │    │    │  2  │                            │ │
│  │  │ Travel Time   │  │    │    └─────┘                            │ │
│  │  │ 15 min walk   │  │    │                                       │ │
│  │  └───────────────┘  │    │    ┌─────┐                            │ │
│  │  ┌───────────────┐  │    │    │  3  │                            │ │
│  │  │ Activity 2    │  │    │    └─────┘                            │ │
│  │  └───────────────┘  │    │                                       │ │
│  └─────────────────────┘    └───────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

**Editing Actions:**
1. **Reorder Activities**: Drag activity cards to new positions within a day
2. **Replace Activity**: Click activity menu → "Replace" → Choose alternative from suggestions
3. **Delete Activity**: Click activity menu → "Delete" → Confirm removal
4. **Add Activity**: Click "Add Activity" button → Select from available locations
5. **Add Note**: Insert custom notes between activities
6. **Set Entry Points**: Configure day start/end locations (hotel, station, etc.)
7. **Undo/Redo**: Use undo/redo buttons to revert or restore changes

**Auto-Save:**
- Changes automatically saved with visual indicator
- Syncs to cloud for authenticated users

---

### 3.4 Authentication Flow

```
┌──────────────┐    ┌───────────────┐    ┌─────────────────┐
│   Account    │───▶│  Enter Email  │───▶│  Check Inbox    │
│    Page      │    │               │    │  for Magic Link │
└──────────────┘    └───────────────┘    └─────────────────┘
                                                 │
                                                 ▼
┌──────────────┐    ┌───────────────┐    ┌─────────────────┐
│   Dashboard  │◀───│   Callback    │◀───│  Click Link     │
│   (Logged In)│    │    Handler    │    │  in Email       │
└──────────────┘    └───────────────┘    └─────────────────┘
```

**Authentication Options:**
- Magic link (passwordless email)
- Email + password (optional)
- OAuth providers (configurable)

**Post-Authentication:**
- Local favorites sync to cloud
- User profile created/updated
- Dashboard shows synced data

---

### 3.5 Favorites Management Flow

```
┌──────────┐    ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│ Explore/ │───▶│   Click     │───▶│   Favorites      │───▶│  Add to     │
│ Itinerary│    │  Heart Icon │    │   Page           │    │  Itinerary  │
└──────────┘    └─────────────┘    └──────────────────┘    └─────────────┘
```

**Flow Details:**
1. User saves locations via heart icon from Explore or Itinerary views
2. Saved locations appear in Favorites page (`/favorites`)
3. User can view, filter, and manage saved locations
4. "Add to Itinerary" button allows inserting favorite into existing trip

---

## 4. Functional Requirements

### 4.1 Location Exploration (FR-EXPLORE)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-EXPLORE-001 | System shall display locations in a responsive grid layout | P0 | Implemented |
| FR-EXPLORE-002 | System shall support filtering by region (8 Japanese regions) | P0 | Implemented |
| FR-EXPLORE-003 | System shall support filtering by category (temples, restaurants, etc.) | P0 | Implemented |
| FR-EXPLORE-004 | System shall support filtering by city within selected regions | P0 | Implemented |
| FR-EXPLORE-005 | System shall support filtering by budget level (budget/moderate/premium) | P1 | Implemented |
| FR-EXPLORE-006 | System shall support text search by location name | P0 | Implemented |
| FR-EXPLORE-007 | System shall display location cards with: image, name, category, rating | P0 | Implemented |
| FR-EXPLORE-008 | System shall paginate results with infinite scroll or pagination controls | P1 | Implemented |
| FR-EXPLORE-009 | System shall display detailed location modal on card click | P0 | Implemented |
| FR-EXPLORE-010 | Location modal shall display: photos, description, reviews, hours, accessibility | P0 | Implemented |
| FR-EXPLORE-011 | System shall allow saving locations to favorites from explore view | P0 | Implemented |
| FR-EXPLORE-012 | System shall show city preview images with location counts | P1 | Implemented |

---

### 4.2 Trip Builder (FR-TRIP)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-TRIP-001 | System shall provide a 5-step wizard for trip creation | P0 | Implemented |
| FR-TRIP-002 | Step 1: System shall allow selection of trip duration (1-14 days) | P0 | Implemented |
| FR-TRIP-003 | Step 1: System shall allow selection of travel dates | P1 | Implemented |
| FR-TRIP-004 | Step 1: System shall allow selection of entry point (airport/city) | P0 | Implemented |
| FR-TRIP-005 | Step 2: System shall allow multi-selection of regions | P0 | Implemented |
| FR-TRIP-006 | Step 2: System shall display cities within selected regions | P0 | Implemented |
| FR-TRIP-007 | Step 3: System shall allow selection of up to 5 interest categories | P0 | Implemented |
| FR-TRIP-008 | Step 3: System shall validate maximum interest selection | P0 | Implemented |
| FR-TRIP-009 | Step 4: System shall capture travel pace preference | P0 | Implemented |
| FR-TRIP-010 | Step 4: System shall capture budget level preference | P0 | Implemented |
| FR-TRIP-011 | Step 4: System shall capture group composition | P1 | Implemented |
| FR-TRIP-012 | Step 4: System shall capture accessibility requirements | P1 | Implemented |
| FR-TRIP-013 | Step 4: System shall capture dietary restrictions | P2 | Implemented |
| FR-TRIP-014 | Step 5: System shall display review of all selections | P0 | Implemented |
| FR-TRIP-015 | Step 5: System shall allow naming the trip | P0 | Implemented |
| FR-TRIP-016 | System shall persist wizard state across browser sessions | P1 | Implemented |
| FR-TRIP-017 | System shall generate itinerary upon wizard completion | P0 | Implemented |

---

### 4.3 Itinerary Generation (FR-ITINGEN)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-ITINGEN-001 | System shall generate day-by-day itineraries based on traveler profile | P0 | Implemented |
| FR-ITINGEN-002 | System shall optimize location selection based on interest alignment | P0 | Implemented |
| FR-ITINGEN-003 | System shall consider geographic proximity when ordering activities | P0 | Implemented |
| FR-ITINGEN-004 | System shall respect operating hours when scheduling activities | P0 | Implemented |
| FR-ITINGEN-005 | System shall include meal slots (breakfast, lunch, dinner) | P1 | Implemented |
| FR-ITINGEN-006 | System shall respect budget constraints in location selection | P1 | Implemented |
| FR-ITINGEN-007 | System shall prioritize wheelchair-friendly locations when specified | P1 | Implemented |
| FR-ITINGEN-008 | System shall calculate travel times between consecutive activities | P0 | Implemented |
| FR-ITINGEN-009 | System shall suggest appropriate transit modes (walk, train, taxi) | P1 | Implemented |
| FR-ITINGEN-010 | System shall ensure diversity in activity types across days | P2 | Implemented |

---

### 4.4 Itinerary Editing (FR-ITINEDIT)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-ITINEDIT-001 | System shall allow drag-and-drop reordering of activities | P0 | Implemented |
| FR-ITINEDIT-002 | System shall recalculate travel times after reordering | P0 | Implemented |
| FR-ITINEDIT-003 | System shall allow replacing an activity with alternatives | P0 | Implemented |
| FR-ITINEDIT-004 | System shall suggest contextually relevant replacement options | P1 | Implemented |
| FR-ITINEDIT-005 | System shall allow deleting activities from itinerary | P0 | Implemented |
| FR-ITINEDIT-006 | System shall allow adding new activities to days | P0 | Implemented |
| FR-ITINEDIT-007 | System shall allow adding custom notes to itinerary | P1 | Implemented |
| FR-ITINEDIT-008 | System shall support undo/redo for edit operations | P1 | Implemented |
| FR-ITINEDIT-009 | System shall auto-save changes with visual indicator | P0 | Implemented |
| FR-ITINEDIT-010 | System shall allow configuring day start/end entry points | P1 | Implemented |
| FR-ITINEDIT-011 | System shall display saving status indicator | P1 | Implemented |

---

### 4.5 Map Visualization (FR-MAP)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-MAP-001 | System shall display interactive Mapbox map alongside timeline | P0 | Implemented |
| FR-MAP-002 | System shall show numbered markers for each activity | P0 | Implemented |
| FR-MAP-003 | System shall draw routes between consecutive activities | P0 | Implemented |
| FR-MAP-004 | System shall auto-fit map bounds to show all day's activities | P1 | Implemented |
| FR-MAP-005 | System shall highlight corresponding timeline item on marker click | P1 | Implemented |
| FR-MAP-006 | System shall display travel segments with mode and duration | P1 | Implemented |
| FR-MAP-007 | System shall update map when switching between days | P0 | Implemented |

---

### 4.6 User Authentication (FR-AUTH)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AUTH-001 | System shall support passwordless magic link authentication | P0 | Implemented |
| FR-AUTH-002 | System shall send magic link emails within 30 seconds | P1 | Implemented |
| FR-AUTH-003 | System shall handle auth callback and establish session | P0 | Implemented |
| FR-AUTH-004 | System shall display auth errors with clear messaging | P1 | Implemented |
| FR-AUTH-005 | System shall support guest mode with full app functionality | P0 | Implemented |
| FR-AUTH-006 | System shall persist guest data in localStorage | P0 | Implemented |
| FR-AUTH-007 | System shall sync local data to cloud upon authentication | P1 | Implemented |
| FR-AUTH-008 | System shall maintain session across browser tabs | P1 | Implemented |

---

### 4.7 Favorites/Wishlist (FR-FAV)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-FAV-001 | System shall allow toggling favorites from any location view | P0 | Implemented |
| FR-FAV-002 | System shall display visual indicator for favorited locations | P0 | Implemented |
| FR-FAV-003 | System shall persist favorites in localStorage for guests | P0 | Implemented |
| FR-FAV-004 | System shall sync favorites to Supabase for authenticated users | P1 | Implemented |
| FR-FAV-005 | System shall provide dedicated favorites management page | P0 | Implemented |
| FR-FAV-006 | System shall allow adding favorited locations to itineraries | P1 | Implemented |

---

### 4.8 Dashboard (FR-DASH)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-DASH-001 | System shall display all user trips on dashboard | P0 | Implemented |
| FR-DASH-002 | System shall show trip cards with: name, dates, region summary | P0 | Implemented |
| FR-DASH-003 | System shall allow navigating to trip itinerary from dashboard | P0 | Implemented |
| FR-DASH-004 | System shall allow renaming trips | P1 | Implemented |
| FR-DASH-005 | System shall allow deleting trips | P1 | Implemented |
| FR-DASH-006 | System shall support restoring deleted trips (soft delete) | P2 | Implemented |
| FR-DASH-007 | System shall display bookmarked guides | P2 | Implemented |
| FR-DASH-008 | System shall show auth status and sync information | P1 | Implemented |

---

### 4.9 Community Features (FR-COMM)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-COMM-001 | System shall display discussion topics in a list view | P2 | Implemented |
| FR-COMM-002 | System shall allow viewing individual topic with replies | P2 | Implemented |
| FR-COMM-003 | System shall allow creating new discussion topics | P2 | Implemented |
| FR-COMM-004 | System shall allow posting replies to topics | P2 | Implemented |
| FR-COMM-005 | System shall allow editing replies | P2 | Implemented |
| FR-COMM-006 | System shall display edit history for transparency | P2 | Implemented |

---

### 4.10 API & Backend (FR-API)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-API-001 | System shall provide RESTful API endpoints for locations | P0 | Implemented |
| FR-API-002 | System shall support pagination for location queries | P0 | Implemented |
| FR-API-003 | System shall implement rate limiting (100 req/min per IP) | P1 | Implemented |
| FR-API-004 | System shall validate and sanitize all input parameters | P0 | Implemented |
| FR-API-005 | System shall return standardized response envelopes | P1 | Implemented |
| FR-API-006 | System shall cache Google Places responses | P1 | Implemented |
| FR-API-007 | System shall provide health check endpoint | P1 | Implemented |
| FR-API-008 | System shall enforce body size limits to prevent DoS | P1 | Implemented |

---

### 4.11 Performance & Security (FR-PERF)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-PERF-001 | System shall implement database indexes for common queries | P1 | Implemented |
| FR-PERF-002 | System shall use full-text search indexes for location search | P1 | Implemented |
| FR-PERF-003 | System shall implement client-side location caching | P1 | Implemented |
| FR-PERF-004 | System shall lazy-load wizard step components | P2 | Implemented |
| FR-PERF-005 | System shall debounce state updates (300ms) | P2 | Implemented |
| FR-PERF-006 | System shall enforce Row-Level Security on user data | P0 | Implemented |
| FR-PERF-007 | System shall validate IP addresses in rate limiting | P1 | Implemented |
| FR-PERF-008 | System shall track Web Vitals metrics | P2 | Implemented |

---

### 4.12 Accessibility (FR-A11Y)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-A11Y-001 | System shall support keyboard navigation for all interactive elements | P1 | Partial |
| FR-A11Y-002 | System shall provide accessible drag-and-drop via @dnd-kit | P1 | Implemented |
| FR-A11Y-003 | System shall filter locations by wheelchair accessibility | P1 | Implemented |
| FR-A11Y-004 | System shall display accessibility information in location details | P1 | Implemented |
| FR-A11Y-005 | System shall use semantic HTML and ARIA attributes | P1 | Partial |

---

## Appendix A: Database Schema

### Core Tables

```sql
-- Curated travel locations
locations (
  id TEXT PRIMARY KEY,
  name TEXT,
  region TEXT,
  city TEXT,
  category TEXT,
  image TEXT,
  min_budget TEXT,
  estimated_duration TEXT,
  operating_hours JSONB,
  recommended_visit JSONB,
  preferred_transit_modes TEXT[],
  coordinates JSONB,  -- {lat, lng}
  timezone TEXT,
  short_description TEXT,
  rating NUMERIC(3,2),
  review_count INTEGER,
  place_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- User favorites (RLS protected)
favorites (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  place_id TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, place_id)
)

-- User profiles (RLS protected)
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  display_name TEXT,
  locale TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Cached Google Places responses
place_details (
  location_id TEXT PRIMARY KEY,
  place_id TEXT,
  payload JSONB,
  fetched_at TIMESTAMPTZ
)
```

---

## Appendix B: Interest Categories

| Category | Description | Example Locations |
|----------|-------------|-------------------|
| Culture | Traditional arts, crafts, ceremonies | Tea houses, Kabuki theaters |
| Food | Culinary experiences, restaurants | Ramen shops, Izakayas |
| Nature | Parks, gardens, scenic spots | Mt. Fuji, Arashiyama |
| Shopping | Markets, districts, stores | Shibuya, Akihabara |
| Photography | Scenic viewpoints, unique spots | Fushimi Inari, Nara |
| Nightlife | Bars, entertainment areas | Shinjuku, Dotonbori |
| Wellness | Onsen, spas, relaxation | Hakone, Beppu |
| History | Temples, shrines, museums | Kinkaku-ji, Tokyo National Museum |

---

## Appendix C: Supported Regions & Major Cities

| Region | Major Cities |
|--------|--------------|
| Kanto | Tokyo, Yokohama, Kamakura, Nikko, Kawagoe |
| Kansai | Osaka, Kyoto, Nara, Kobe, Himeji |
| Hokkaido | Sapporo, Otaru, Hakodate, Furano |
| Tohoku | Sendai, Aomori, Morioka |
| Chubu | Nagoya, Kanazawa, Takayama, Matsumoto |
| Chugoku | Hiroshima, Okayama, Kurashiki |
| Shikoku | Matsuyama, Takamatsu, Tokushima |
| Kyushu/Okinawa | Fukuoka, Nagasaki, Kagoshima, Naha |

---

## Appendix D: Future Roadmap

### Phase 2 (Planned)
- Weather integration for itinerary recommendations
- Trip sharing via shareable links
- React Query/SWR caching consolidation

### Phase 3 (Planned)
- Mobile app / Progressive Web App
- Real-time collaboration on itineraries
- User review and rating system

### Phase 4 (Future)
- AI-powered personalization
- Social features (following, recommendations)
- Advanced analytics dashboard

---

*Document generated from codebase analysis - January 2026*
