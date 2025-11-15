# Vercel Deployment Checklist

**Repository:** `mel-koku/koku-travel`  
**Branch:** `main`  
**Status:** ✅ Ready for Deployment  
**Last Updated:** $(date)

---

## 📋 Pre-Deployment Checklist

### ✅ Code & Repository
- [x] Code merged to `main` branch
- [x] Build passes locally (`npm run build`)
- [x] No linter errors
- [x] All changes committed and pushed
- [x] Repository is clean (no uncommitted changes)

### ✅ Configuration Files
- [x] `next.config.ts` - Production-ready
- [x] `package.json` - All dependencies listed
- [x] `env.local.example` - Complete template
- [x] `.gitignore` - Properly configured

---

## 🔐 Step 1: Gather Environment Variables

Before deploying, gather all required environment variables:

### Supabase Variables (3 required)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - **Source:** Supabase Dashboard → Project Settings → API → Project URL
  - **Example:** `https://xxxxx.supabase.co`

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **Source:** Supabase Dashboard → Project Settings → API → `anon` `public` key
  - **Note:** This is safe to expose in client-side code

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - **Source:** Supabase Dashboard → Project Settings → API → `service_role` `secret` key
  - **⚠️ SENSITIVE:** Mark as "Sensitive" in Vercel
  - **⚠️ NEVER expose in client-side code**

### Sanity CMS - Server-side (5 required)
- [ ] `SANITY_PROJECT_ID`
  - **Source:** Sanity Dashboard → Project Settings → Project ID
  - **Example:** `abc123xyz`

- [ ] `SANITY_DATASET`
  - **Value:** `production` (or your dataset name)
  - **Source:** Sanity Dashboard → Datasets

- [ ] `SANITY_API_READ_TOKEN`
  - **Source:** Sanity Dashboard → Project Settings → API → Tokens → Create Read Token
  - **Permissions:** Read-only access
  - **⚠️ SENSITIVE:** Mark as "Sensitive" in Vercel

- [ ] `SANITY_API_VERSION`
  - **Value:** `2024-10-21`
  - **Fixed value** - use exactly this

- [ ] `SANITY_REVALIDATE_SECRET`
  - **Generate:** `openssl rand -hex 32`
  - **⚠️ SENSITIVE:** Mark as "Sensitive" in Vercel
  - **Used for:** Webhook revalidation

### Sanity CMS - Client-side (3 required)
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID`
  - **Value:** Same as `SANITY_PROJECT_ID` above
  - **Note:** Must have `NEXT_PUBLIC_` prefix for client-side

- [ ] `NEXT_PUBLIC_SANITY_DATASET`
  - **Value:** Same as `SANITY_DATASET` above (usually `production`)

- [ ] `NEXT_PUBLIC_SANITY_API_VERSION`
  - **Value:** `2024-10-21`
  - **Fixed value** - same as server-side

### Optional Variables (Set after first deployment)
- [ ] `NEXT_PUBLIC_SITE_URL`
  - **Value:** Will be your Vercel URL (e.g., `https://koku-travel.vercel.app`)
  - **⚠️ Set AFTER first deployment** - you'll get the URL from Vercel

### Optional: Routing (if using Mapbox)
- [ ] `ROUTING_PROVIDER`
  - **Value:** `mapbox` (if using Mapbox routing)

- [ ] `ROUTING_MAPBOX_ACCESS_TOKEN`
  - **Source:** Mapbox Dashboard → Access Tokens

### Optional: Google APIs (if using)
- [ ] `GOOGLE_PLACES_API_KEY`
- [ ] `ROUTING_GOOGLE_MAPS_API_KEY`
- [ ] `GOOGLE_DIRECTIONS_API_KEY`

### Optional: Error Tracking (Sentry)
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_DSN`
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`
- [ ] `NEXT_PUBLIC_ENABLE_ERROR_TRACKING` = `true`

### Optional: Rate Limiting (Upstash Redis)
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`

---

## 🚀 Step 2: Deploy to Vercel

### 2.1 Create/Login to Vercel Account
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up or log in (GitHub login recommended)
- [ ] Complete onboarding if new account

### 2.2 Import Project
- [ ] Click **"Add New..."** → **"Project"**
- [ ] Select repository: `mel-koku/koku-travel`
- [ ] Verify Vercel auto-detected **Next.js** framework ✅
- [ ] Verify settings:
  - Framework Preset: **Next.js**
  - Root Directory: `./` (or blank)
  - Build Command: `npm run build` (auto-detected)
  - Output Directory: `.next` (auto-detected)
  - Install Command: `npm ci` (auto-detected)

### 2.3 Configure Environment Variables
**⚠️ IMPORTANT:** Set these BEFORE clicking "Deploy"

- [ ] Go to **"Environment Variables"** section
- [ ] Add ALL 11 required variables listed above
- [ ] Set each variable for **Production** environment
- [ ] Mark sensitive variables as "Sensitive":
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SANITY_API_READ_TOKEN`
  - `SANITY_REVALIDATE_SECRET`
- [ ] **DO NOT set `NEXT_PUBLIC_SITE_URL` yet** - we'll do this after first deploy

### 2.4 Deploy
- [ ] Click **"Deploy"** button
- [ ] Watch build logs (should take 2-3 minutes)
- [ ] Wait for deployment to complete ✅
- [ ] Note your deployment URL (e.g., `https://koku-travel-abc123.vercel.app`)

---

## ✅ Step 3: Post-Deployment Configuration

### 3.1 Update Site URL
- [ ] Copy your Vercel deployment URL
- [ ] Go to **Project Settings → Environment Variables**
- [ ] Add `NEXT_PUBLIC_SITE_URL` = `https://your-actual-url.vercel.app`
- [ ] Set for **Production** environment
- [ ] Redeploy (or wait for next push)

### 3.2 Configure Sanity Webhook (Recommended)
For content revalidation when you update Sanity content:

- [ ] Go to **Sanity Dashboard → Project Settings → API → Webhooks**
- [ ] Click **"Create webhook"**
- [ ] Configure:
  - **URL:** `https://your-project.vercel.app/api/revalidate`
  - **Dataset:** `production` (or your dataset)
  - **Trigger on:** Create, Update, Delete
  - **HTTP method:** POST
  - **API version:** `2024-10-21`
  - **Secret:** Your `SANITY_REVALIDATE_SECRET` value
- [ ] Click **"Save"**
- [ ] Test by updating content in Sanity Studio

---

## 🧪 Step 4: Verification Tests

### 4.1 Basic Functionality
- [ ] App loads at Vercel URL without errors
- [ ] No console errors in browser (check DevTools)
- [ ] Pages render correctly
- [ ] Images load properly
- [ ] Navigation works

### 4.2 Authentication
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Logout works
- [ ] Protected routes redirect correctly

### 4.3 Features
- [ ] Content loads from Sanity CMS
- [ ] Favorites/bookmarks work
- [ ] Itinerary builder functions
- [ ] Travel mode selector works
- [ ] Routing API endpoints respond
- [ ] Community features work
- [ ] API routes respond correctly

### 4.4 Sanity Studio
- [ ] Studio accessible at `/studio`
- [ ] Can log in to Studio
- [ ] Can view/edit content
- [ ] Changes reflect on site (after webhook triggers)

### 4.5 Performance
- [ ] Page load times are acceptable
- [ ] Images optimize correctly
- [ ] No memory leaks (check browser console)

---

## 🔧 Step 5: Optional Post-Deployment Setup

### 5.1 Custom Domain (Optional)
- [ ] Go to **Project Settings → Domains**
- [ ] Add your custom domain
- [ ] Follow DNS configuration instructions
- [ ] Wait for SSL certificate (automatic, usually < 5 minutes)
- [ ] Update `NEXT_PUBLIC_SITE_URL` to custom domain
- [ ] Redeploy

### 5.2 Monitoring Setup (Optional)
- [ ] Configure Sentry (if using error tracking)
- [ ] Set up uptime monitoring
- [ ] Configure performance monitoring
- [ ] Set up log aggregation

### 5.3 Database Migrations (if needed)
- [ ] Verify Supabase migrations are applied
- [ ] Check required tables exist:
  - `profiles`
  - `favorites`
  - `guide_bookmarks`
  - `place_details`

---

## 🐛 Troubleshooting

### Build Fails
**Check:**
- [ ] Build logs in Vercel dashboard
- [ ] Run `npm run build` locally first
- [ ] Verify all dependencies in `package.json`
- [ ] Check for TypeScript errors

### Environment Variables Not Working
**Check:**
- [ ] Variable names are exact (case-sensitive)
- [ ] Variables set for correct environment (Production/Preview/Development)
- [ ] Redeploy after adding variables
- [ ] Check variable values are correct (no extra spaces)

### Images Not Loading
**Check:**
- [ ] `NEXT_PUBLIC_SITE_URL` is set correctly
- [ ] Image domains in `next.config.ts` are correct
- [ ] Sanity CDN access is working
- [ ] Check browser console for CORS errors

### API Routes Failing
**Check:**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] API keys are valid
- [ ] Check server logs in Vercel dashboard
- [ ] Verify rate limiting isn't blocking requests

### Sanity Studio Not Working
**Check:**
- [ ] All `NEXT_PUBLIC_SANITY_*` variables are set
- [ ] `NEXT_PUBLIC_SANITY_API_VERSION` is `2024-10-21`
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID` matches `SANITY_PROJECT_ID`
- [ ] Check browser console for errors

### Authentication Not Working
**Check:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is correct
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- [ ] Supabase project is active
- [ ] Check Supabase dashboard for errors

---

## 📊 Deployment Summary

**Deployment Date:** _______________  
**Vercel URL:** _______________  
**Custom Domain:** _______________ (if applicable)  
**Environment Variables Set:** ___ / 11 required  
**Webhook Configured:** [ ] Yes [ ] No  
**All Tests Passed:** [ ] Yes [ ] No  

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

---

## 📚 Reference Documentation

- **Quick Start:** `FRESH_DEPLOYMENT_GUIDE.md`
- **Detailed Review:** `DEPLOYMENT_READINESS_REVIEW.md`
- **Environment Setup:** `docs/VERCEL_ENV_SETUP.md`
- **Variable Reference:** `docs/ENV_VARIABLES_REFERENCE.md`
- **Deployment Plan:** `DEPLOYMENT_PLAN.md`

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] All required environment variables set
- [ ] Build succeeded
- [ ] App accessible at Vercel URL
- [ ] No runtime errors
- [ ] Authentication works
- [ ] Content loads from Sanity
- [ ] Site URL updated
- [ ] Webhook configured (optional but recommended)
- [ ] All verification tests passed
- [ ] Documentation updated with deployment URL

---

**Status:** ⏳ Ready to Deploy → 🚀 In Progress → ✅ Deployed

**Last Deployment:** _______________

