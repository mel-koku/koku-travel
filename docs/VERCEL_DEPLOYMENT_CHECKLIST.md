# Vercel Deployment Checklist

This checklist will guide you through deploying Koku Travel to Vercel step by step.

## ✅ Pre-Deployment Checklist

### 1. Code Quality
- [x] Build succeeds locally (`npm run build`)
- [ ] Linting errors fixed (warnings are OK, but fix critical errors)
- [ ] Tests pass (if applicable)
- [ ] All changes committed to Git

### 2. Environment Variables Preparation

Gather all the following values before starting deployment:

#### Supabase (Required)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)

#### Sanity CMS (Required)
- [ ] `SANITY_PROJECT_ID` - Your Sanity project ID
- [ ] `SANITY_DATASET` - Usually `production` or `development`
- [ ] `SANITY_API_READ_TOKEN` - Token with read permissions
- [ ] `SANITY_API_WRITE_TOKEN` - Token with write permissions (optional, for scripts)
- [ ] `SANITY_PREVIEW_SECRET` - Random secret string for preview mode
- [ ] `SANITY_API_VERSION` - API version (default: `2024-10-21`)
- [ ] `SANITY_REVALIDATE_SECRET` - Secret for webhook revalidation

#### Site Configuration (Required after first deploy)
- [ ] `NEXT_PUBLIC_SITE_URL` - Will be your Vercel URL (e.g., `https://koku-travel.vercel.app`)

#### Optional Services
- [ ] `ROUTING_PROVIDER` - Set to `mapbox` if using Mapbox routing
- [ ] `ROUTING_MAPBOX_ACCESS_TOKEN` - Your Mapbox access token
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking
- [ ] `SENTRY_DSN` - Sentry DSN (server-side)
- [ ] `SENTRY_ORG` - Sentry organization slug
- [ ] `SENTRY_PROJECT` - Sentry project slug
- [ ] `NEXT_PUBLIC_ENABLE_ERROR_TRACKING` - Set to `true` to enable

### 3. Database Setup
- [ ] Supabase migrations applied
- [ ] Required tables exist: `profiles`, `favorites`, `guide_bookmarks`, `place_details`
- [ ] Test database connection works

### 4. Git Repository
- [ ] Code pushed to GitHub/GitLab/Bitbucket
- [ ] Main branch is up to date
- [ ] No sensitive data in repository (check `.gitignore`)

---

## 🚀 Deployment Steps

### Step 1: Create Vercel Account
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign up or log in (GitHub login recommended)
- [ ] Complete onboarding

### Step 2: Import Project
- [ ] Click "Add New..." → "Project"
- [ ] Import your `koku-travel` repository
- [ ] Verify Vercel auto-detected Next.js framework

### Step 3: Configure Build Settings
Verify these settings (should be auto-detected):
- [ ] Framework Preset: **Next.js**
- [ ] Root Directory: `./` (or blank)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm ci`

### Step 4: Set Environment Variables
Go to **Project Settings → Environment Variables** and add:

#### For Production Environment:
Add all required variables listed above. Make sure to:
- [ ] Set each variable for **Production** environment
- [ ] Use production credentials (not development/test)
- [ ] Double-check variable names (case-sensitive!)
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-side only)

#### For Preview Environment (Optional):
- [ ] Copy production variables or use staging credentials
- [ ] Set variables for **Preview** environment

#### For Development Environment (Optional):
- [ ] Use development credentials
- [ ] Set variables for **Development** environment

**Important:** Do NOT set `NEXT_PUBLIC_SITE_URL` yet - we'll set it after the first deployment.

### Step 5: Deploy
- [ ] Click **"Deploy"** button
- [ ] Wait for build to complete (watch the logs)
- [ ] Note your deployment URL (e.g., `https://koku-travel-abc123.vercel.app`)

### Step 6: Update Site URL
After first deployment:
- [ ] Copy your Vercel deployment URL
- [ ] Go to **Project Settings → Environment Variables**
- [ ] Add/Update `NEXT_PUBLIC_SITE_URL` = `https://your-project.vercel.app`
- [ ] Set for **Production** environment
- [ ] Redeploy (or wait for next push)

---

## ✅ Post-Deployment Verification

### 1. Basic Functionality
- [ ] App loads at Vercel URL without errors
- [ ] No console errors in browser
- [ ] Pages render correctly
- [ ] Images load properly
- [ ] Navigation works

### 2. Authentication
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Logout works
- [ ] Protected routes redirect correctly

### 3. Features
- [ ] Content loads from Sanity CMS
- [ ] Favorites/bookmarks work
- [ ] Itinerary builder functions
- [ ] Community features work
- [ ] API routes respond correctly

### 4. Performance
- [ ] Page load times are acceptable
- [ ] Images optimize correctly
- [ ] No memory leaks (check browser console)

---

## 🔧 Post-Deployment Configuration

### 1. Sanity Webhook Setup
Configure webhook for content revalidation:

- [ ] Go to Sanity Project Settings → API → Webhooks
- [ ] Create new webhook:
  - **URL**: `https://your-project.vercel.app/api/revalidate`
  - **Dataset**: `production` (or your dataset name)
  - **Trigger on**: Create, Update, Delete
  - **Secret**: Use your `SANITY_REVALIDATE_SECRET` value
  - **HTTP method**: POST
  - **API version**: `2024-10-21`
- [ ] Test webhook by updating content in Sanity Studio

### 2. Custom Domain (Optional)
- [ ] Go to **Project Settings → Domains**
- [ ] Add your custom domain
- [ ] Follow DNS configuration instructions
- [ ] Wait for SSL certificate (automatic, usually < 5 minutes)
- [ ] Update `NEXT_PUBLIC_SITE_URL` to custom domain

### 3. Monitoring Setup (Optional)
- [ ] Configure Sentry (if using error tracking)
- [ ] Set up uptime monitoring
- [ ] Configure performance monitoring
- [ ] Set up log aggregation

---

## 🔄 Continuous Deployment

After initial setup:
- ✅ Pushes to `main` branch → Automatic production deployment
- ✅ Pull requests → Automatic preview deployments
- ✅ Each deployment gets unique URL for testing

---

## 🐛 Troubleshooting

### Build Fails
**Check:**
- Build logs in Vercel dashboard
- Run `npm run build` locally first
- Verify all dependencies in `package.json`

### Environment Variables Not Working
**Check:**
- Variable names are exact (case-sensitive)
- Variables set for correct environment (Production/Preview/Development)
- Redeploy after adding variables

### Images Not Loading
**Check:**
- `NEXT_PUBLIC_SITE_URL` is set correctly
- Image domains in `next.config.ts` are correct
- Sanity CDN access is working

### API Routes Failing
**Check:**
- `SUPABASE_SERVICE_ROLE_KEY` is set
- API keys are valid
- Check server logs in Vercel dashboard

---

## 📝 Notes

- Keep this checklist updated as you go through deployment
- Document any custom configurations or issues encountered
- Save your Vercel project URL for future reference

---

**Last Updated:** $(date)
**Deployment Status:** ⏳ In Progress

