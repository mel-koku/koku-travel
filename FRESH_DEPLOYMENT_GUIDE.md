# Fresh Vercel Deployment Guide

**Repository:** `mel-koku/koku-travel`  
**Status:** ✅ Ready for Fresh Deployment  
**Last Review:** $(date)

---

## 🎯 Quick Start

This guide will help you deploy a fresh instance of Koku Travel to Vercel, ensuring it matches your GitHub repository exactly.

---

## ✅ Pre-Deployment Verification

### 1. Repository Status
- ✅ **Git Remote:** `git@github.com:mel-koku/koku-travel.git`
- ✅ **Working Tree:** Clean
- ✅ **Build Test:** ✅ Passes (`npm run build` succeeds)

### 2. Code Quality
- ✅ TypeScript compilation: Success
- ✅ Next.js build: Success
- ✅ No hardcoded secrets or URLs
- ✅ Environment variables properly documented

### 3. Configuration Files
- ✅ `next.config.ts` - Production-ready
- ✅ `package.json` - All dependencies listed
- ✅ `.gitignore` - Properly excludes sensitive files
- ✅ `env.local.example` - Complete template

---

## 📋 Environment Variables Checklist

### Required Variables (11 total)

#### Supabase (3)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Sensitive

#### Sanity CMS - Server-side (5)
- [ ] `SANITY_PROJECT_ID`
- [ ] `SANITY_DATASET` (usually `production`)
- [ ] `SANITY_API_READ_TOKEN`
- [ ] `SANITY_API_VERSION` = `2024-10-21`
- [ ] `SANITY_REVALIDATE_SECRET` ⚠️ Sensitive

#### Sanity CMS - Client-side (3)
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID` (same as `SANITY_PROJECT_ID`)
- [ ] `NEXT_PUBLIC_SANITY_DATASET` (same as `SANITY_DATASET`)
- [ ] `NEXT_PUBLIC_SANITY_API_VERSION` = `2025-11-13`

**Note:** The different API versions are intentional - Sanity uses different versions for client-side Studio vs server-side API.

### Optional Variables
- [ ] `NEXT_PUBLIC_SITE_URL` - Set AFTER first deployment
- [ ] `SANITY_API_WRITE_TOKEN` - For scripts (optional)
- [ ] `SANITY_PREVIEW_SECRET` - For preview mode (optional)
- [ ] `ROUTING_PROVIDER` - Set to `mapbox` if using Mapbox
- [ ] `ROUTING_MAPBOX_ACCESS_TOKEN` - Mapbox token (optional)

---

## 🚀 Deployment Steps

### Step 1: Ensure Main Branch is Ready

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# If you have changes on your current branch:
git merge feat/test-phase1-api-routes  # or your current branch
git push origin main
```

### Step 2: Gather Environment Variables

**From Supabase Dashboard:**
1. Go to Project Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

**From Sanity Dashboard:**
1. Go to Project Settings → API
2. Copy:
   - Project ID → Use for both `SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - Dataset → Use for both `SANITY_DATASET` and `NEXT_PUBLIC_SANITY_DATASET`
   - Create Read Token → `SANITY_API_READ_TOKEN`

**Generate Secrets:**
```bash
# Generate SANITY_REVALIDATE_SECRET
openssl rand -hex 32

# Generate SANITY_PREVIEW_SECRET (if using preview)
openssl rand -hex 32
```

### Step 3: Deploy to Vercel

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign up/Login (use GitHub)

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Select: `mel-koku/koku-travel`
   - Vercel will auto-detect Next.js ✅

3. **Configure Environment Variables:**
   - Before clicking "Deploy", go to "Environment Variables"
   - Add ALL 11 required variables
   - Set for **Production** environment
   - ⚠️ Mark sensitive variables as "Sensitive":
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SANITY_REVALIDATE_SECRET`
   - ⚠️ **Do NOT set `NEXT_PUBLIC_SITE_URL` yet**

4. **Deploy:**
   - Click "Deploy"
   - Watch build logs (2-3 minutes)
   - Wait for completion ✅

5. **Get Your URL:**
   - Copy your Vercel URL (e.g., `https://koku-travel-abc123.vercel.app`)

### Step 4: Update Site URL

After first deployment:
1. Go to **Project Settings → Environment Variables**
2. Add `NEXT_PUBLIC_SITE_URL` = `https://your-actual-url.vercel.app`
3. Set for **Production**
4. Redeploy

### Step 5: Verify Deployment

Test these:
- [ ] App loads without errors
- [ ] No console errors
- [ ] Authentication works
- [ ] Sanity content loads
- [ ] Images display correctly
- [ ] API routes work
- [ ] Sanity Studio at `/studio` works

### Step 6: Configure Sanity Webhook (Optional)

For content revalidation:
1. Sanity Dashboard → Project Settings → API → Webhooks
2. Create webhook:
   - **URL:** `https://your-project.vercel.app/api/revalidate`
   - **Dataset:** `production`
   - **Secret:** Your `SANITY_REVALIDATE_SECRET`
   - **Trigger:** Create, Update, Delete
   - **Method:** POST
   - **API version:** `2024-10-21`

---

## 🔍 Verification Checklist

### Before Deployment
- [ ] Main branch is up to date
- [ ] All environment variables gathered
- [ ] Supabase migrations applied (if needed)
- [ ] Sanity project configured

### After Deployment
- [ ] Build succeeded
- [ ] App accessible at Vercel URL
- [ ] No runtime errors
- [ ] Authentication works
- [ ] Content loads from Sanity
- [ ] Site URL updated

---

## 📚 Reference Documentation

- **Quick Start:** `DEPLOYMENT_PLAN.md`
- **Detailed Checklist:** `docs/VERCEL_DEPLOYMENT_CHECKLIST.md`
- **Environment Setup:** `docs/VERCEL_ENV_SETUP.md`
- **Variable Reference:** `docs/ENV_VARIABLES_REFERENCE.md`
- **Full Review:** `DEPLOYMENT_READINESS_REVIEW.md`

---

## ⚠️ Important Notes

1. **API Versions:** Sanity uses different API versions:
   - Server-side: `2024-10-21`
   - Client-side (Studio): `2025-11-13`
   - This is correct and intentional

2. **Site URL:** Must be set AFTER first deployment to get actual Vercel URL

3. **Sensitive Variables:** Always mark these as "Sensitive" in Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SANITY_REVALIDATE_SECRET`
   - `SANITY_PREVIEW_SECRET` (if using)

4. **Database:** Ensure Supabase migrations are applied before deployment

---

## 🐛 Troubleshooting

**Build Fails?**
- Check build logs in Vercel dashboard
- Verify all required environment variables are set
- Run `npm run build` locally first

**Environment Variables Not Working?**
- Check variable names are exact (case-sensitive)
- Ensure variables are set for correct environment
- Redeploy after adding variables

**Sanity Studio Not Working?**
- Verify all `NEXT_PUBLIC_SANITY_*` variables are set
- Check that `NEXT_PUBLIC_SANITY_API_VERSION` is `2025-11-13`

**API Routes Failing?**
- Check `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify server-side Sanity variables are set
- Check server logs in Vercel dashboard

---

## ✅ Final Status

**Repository:** ✅ Ready  
**Code:** ✅ Production-ready  
**Configuration:** ✅ Complete  
**Documentation:** ✅ Comprehensive  
**Build:** ✅ Successful  

**You're ready to deploy! 🚀**

