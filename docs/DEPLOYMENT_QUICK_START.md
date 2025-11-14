# Vercel Deployment Quick Start Guide

## 🎯 Current Status

✅ **Build Status:** Build succeeds locally  
✅ **Git Repository:** Connected to GitHub (`mel-koku/koku-travel`)  
✅ **Code Quality:** Critical linting errors fixed  
⏳ **Ready for Deployment:** Yes, after committing changes

---

## 📋 Step-by-Step Deployment Process

### Step 1: Commit Your Changes (Do This First)

You have uncommitted changes. Let's commit them:

```bash
# Review what changed
git status

# Add all changes
git add .

# Commit with a descriptive message
git commit -m "Prepare for Vercel deployment: fix linting errors and add deployment docs"

# Push to GitHub
git push origin main
```

### Step 2: Gather Environment Variables

Before deploying, you need these values ready. Check your `.env.local` file or the services:

**Required:**
- Supabase URL and keys (from Supabase dashboard)
- Sanity project ID, dataset, and tokens (from Sanity dashboard)
- Random secrets for `SANITY_PREVIEW_SECRET` and `SANITY_REVALIDATE_SECRET`

**Optional:**
- Mapbox token (if using routing)
- Sentry DSN (if using error tracking)

See `docs/ENV_VARIABLES_REFERENCE.md` for detailed instructions.

### Step 3: Deploy to Vercel

1. **Go to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Sign up/Login (use GitHub for easy integration)

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `mel-koku/koku-travel`
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables:**
   - Go to "Environment Variables" section
   - Add all required variables (see checklist below)
   - Set each for **Production** environment
   - **Important:** Don't set `NEXT_PUBLIC_SITE_URL` yet - we'll do this after first deploy

4. **Deploy:**
   - Click "Deploy"
   - Watch the build logs
   - Wait for deployment to complete (~2-3 minutes)

5. **Get Your URL:**
   - After deployment, copy your Vercel URL (e.g., `https://koku-travel-abc123.vercel.app`)
   - Go back to Environment Variables
   - Add `NEXT_PUBLIC_SITE_URL` = `https://your-actual-url.vercel.app`
   - Redeploy or wait for next push

### Step 4: Verify Deployment

Test these after deployment:
- [ ] App loads without errors
- [ ] Authentication works (sign up/login)
- [ ] Content loads from Sanity
- [ ] Images display correctly
- [ ] API routes respond

### Step 5: Configure Sanity Webhook

After deployment, set up content revalidation:

1. Go to Sanity Dashboard → Project Settings → API → Webhooks
2. Create webhook:
   - **URL:** `https://your-project.vercel.app/api/revalidate`
   - **Dataset:** `production`
   - **Secret:** Your `SANITY_REVALIDATE_SECRET` value
   - **Trigger:** Create, Update, Delete
   - **Method:** POST

---

## 🔑 Environment Variables Checklist

Copy these into Vercel's Environment Variables section:

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_value_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value_here
SUPABASE_SERVICE_ROLE_KEY=your_value_here

# Sanity
SANITY_PROJECT_ID=your_value_here
SANITY_DATASET=production
SANITY_API_READ_TOKEN=your_value_here
SANITY_API_WRITE_TOKEN=your_value_here
SANITY_PREVIEW_SECRET=generate_random_string
SANITY_API_VERSION=2024-10-21
SANITY_REVALIDATE_SECRET=generate_random_string

# Site URL (set after first deploy)
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
```

### Optional Variables

```bash
# Mapbox (if using)
ROUTING_PROVIDER=mapbox
ROUTING_MAPBOX_ACCESS_TOKEN=your_token

# Sentry (if using)
NEXT_PUBLIC_SENTRY_DSN=your_dsn
SENTRY_DSN=your_dsn
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```

---

## 🚨 Common Issues & Solutions

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `npm run build` works locally

### Environment Variables Not Working
- Check variable names are exact (case-sensitive)
- Ensure variables are set for correct environment
- Redeploy after adding variables

### Images Not Loading
- Set `NEXT_PUBLIC_SITE_URL` correctly
- Verify image domains in `next.config.ts`

---

## 📚 Additional Resources

- **Full Checklist:** `docs/VERCEL_DEPLOYMENT_CHECKLIST.md`
- **Environment Variables:** `docs/ENV_VARIABLES_REFERENCE.md`
- **Deployment Guide:** `docs/deployment-guide.md`

---

## ✅ Next Actions

1. **Commit your changes** (see Step 1 above)
2. **Gather environment variables** from your services
3. **Deploy to Vercel** following Step 3
4. **Verify everything works** (Step 4)
5. **Set up webhook** (Step 5)

---

**Need Help?** Check the detailed guides in the `docs/` folder or review Vercel's Next.js documentation.

