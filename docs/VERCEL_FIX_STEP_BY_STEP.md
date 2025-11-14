# 🔧 Vercel Build Fix - Step-by-Step Plan

This guide will walk you through fixing the Vercel build error step by step.

## ✅ Step 1: Push the Fixes to Git

The changes I made allow the build to succeed even without environment variables. You need to commit and push these changes first.

### 1.1 Check what changed:
```bash
git status
```

You should see these modified files:
- `src/lib/sanity/config.ts`
- `src/lib/sanity/client.ts`
- `src/sanity/env.ts`
- `env.local.example`
- `docs/ENV_VARIABLES_REFERENCE.md`

### 1.2 Stage the changes:
```bash
git add src/lib/sanity/config.ts src/lib/sanity/client.ts src/sanity/env.ts env.local.example docs/ENV_VARIABLES_REFERENCE.md
```

### 1.3 Commit:
```bash
git commit -m "fix: make Sanity config build-safe for Vercel deployment

- Defer environment variable validation to runtime
- Use lazy initialization for Sanity client
- Allow build to succeed without env vars (validates at runtime)
- Add NEXT_PUBLIC_ prefixed variables for Studio"
```

### 1.4 Push to your repository:
```bash
git push origin main
```

**Note:** If you're on a different branch, replace `main` with your branch name.

---

## 🔑 Step 2: Gather Your Environment Variables

Before setting up Vercel, gather all your environment variable values. You'll need:

### Required Variables:

#### Supabase (if you're using it):
- `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From same location
- `SUPABASE_SERVICE_ROLE_KEY` - From same location (keep secret!)

#### Sanity CMS (Required for Guides to work):
- `SANITY_PROJECT_ID` - From Sanity Dashboard → Project Settings → API
- `NEXT_PUBLIC_SANITY_PROJECT_ID` - **Same value** as above (needed for Studio)
- `SANITY_DATASET` - Usually `production` or `development`
- `NEXT_PUBLIC_SANITY_DATASET` - **Same value** as above
- `SANITY_API_READ_TOKEN` - From Sanity Dashboard → Project Settings → API → Tokens
- `SANITY_API_VERSION` - Use `2024-10-21`
- `NEXT_PUBLIC_SANITY_API_VERSION` - Use `2025-11-13`

#### Optional (but recommended):
- `SANITY_API_WRITE_TOKEN` - For content management scripts
- `SANITY_PREVIEW_SECRET` - Generate with: `openssl rand -hex 32`
- `SANITY_REVALIDATE_SECRET` - Generate with: `openssl rand -hex 32`

**💡 Tip:** Create a text file or password manager entry with all these values before going to Vercel.

---

## 🚀 Step 3: Set Up Environment Variables in Vercel

### 3.1 Go to Vercel Dashboard:
1. Open [vercel.com](https://vercel.com)
2. Log in to your account
3. Find your `koku-travel` project (or create it if it doesn't exist)

### 3.2 Navigate to Environment Variables:
1. Click on your project
2. Go to **Settings** (top menu)
3. Click **Environment Variables** (left sidebar)

### 3.3 Add Each Variable:

For **each** variable below, click **"Add New"** and fill in:

#### Start with Sanity (Minimum to fix the build error):

1. **Variable Name:** `SANITY_PROJECT_ID`
   - **Value:** Your Sanity project ID
   - **Environment:** Select **Production**, **Preview**, and **Development** (or at least Production)
   - Click **Save**

2. **Variable Name:** `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - **Value:** Same Sanity project ID as above
   - **Environment:** Select **Production**, **Preview**, and **Development**
   - Click **Save**

3. **Variable Name:** `SANITY_DATASET`
   - **Value:** `production` (or your dataset name)
   - **Environment:** Select all environments
   - Click **Save**

4. **Variable Name:** `NEXT_PUBLIC_SANITY_DATASET`
   - **Value:** `production` (same as above)
   - **Environment:** Select all environments
   - Click **Save**

5. **Variable Name:** `SANITY_API_VERSION`
   - **Value:** `2024-10-21`
   - **Environment:** Select all environments
   - Click **Save**

6. **Variable Name:** `NEXT_PUBLIC_SANITY_API_VERSION`
   - **Value:** `2025-11-13`
   - **Environment:** Select all environments
   - Click **Save**

7. **Variable Name:** `SANITY_API_READ_TOKEN`
   - **Value:** Your Sanity read token
   - **Environment:** Select all environments
   - Click **Save**

#### Add Supabase (if using):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Optional Sanity Variables:
- `SANITY_API_WRITE_TOKEN`
- `SANITY_PREVIEW_SECRET` (generate random string)
- `SANITY_REVALIDATE_SECRET` (generate random string)

**⚠️ Important:** 
- Variable names are **case-sensitive** - type them exactly as shown
- Make sure to select the correct environment(s) for each variable
- After adding variables, you need to redeploy (see Step 4)

---

## 🔄 Step 4: Trigger a New Deployment

After pushing your code and setting environment variables, trigger a new deployment:

### Option A: Automatic (if connected to Git):
- If your Vercel project is connected to GitHub/GitLab/Bitbucket
- The push you did in Step 1 should automatically trigger a new deployment
- Go to **Deployments** tab in Vercel to see it building

### Option B: Manual Redeploy:
1. Go to **Deployments** tab in Vercel
2. Find your latest deployment
3. Click the **"..."** menu (three dots)
4. Click **"Redeploy"**
5. Confirm the redeploy

### Option C: Force Redeploy (if variables don't seem to work):
1. Go to **Settings** → **Environment Variables**
2. After adding/updating variables, Vercel will show a banner
3. Click **"Redeploy"** in that banner

---

## ✅ Step 5: Monitor the Build

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Watch the build logs

### What to Look For:

✅ **Success indicators:**
- "✓ Compiled successfully"
- "Collecting page data..." completes without errors
- Build finishes with "Build Completed"

❌ **If you still see errors:**
- Check that all variable names are spelled correctly
- Verify variables are set for the correct environment
- Make sure you clicked "Save" after adding each variable
- Check the build logs for specific error messages

---

## 🧪 Step 6: Test Your Deployment

After the build succeeds:

1. **Visit your deployment URL** (shown in Vercel dashboard)
2. **Test these pages:**
   - Homepage (`/`)
   - Guides page (`/guides`)
   - Individual guide (`/guides/[id]`) - should load from Sanity
   - Studio (`/studio`) - should load Sanity Studio

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Look for any errors
   - If you see Sanity errors, double-check your environment variables

---

## 🐛 Troubleshooting

### Build Still Fails with "Missing SANITY_PROJECT_ID"

**Possible causes:**
1. Variables not saved correctly
   - Go back to Settings → Environment Variables
   - Verify each variable exists and has a value
   - Make sure you selected the correct environment(s)

2. Variables added but not redeployed
   - You MUST redeploy after adding variables
   - Go to Deployments → Redeploy

3. Wrong variable names
   - Double-check spelling (case-sensitive!)
   - Make sure you have BOTH `SANITY_PROJECT_ID` AND `NEXT_PUBLIC_SANITY_PROJECT_ID`

### Pages Load But Show Errors

- Check browser console for specific error messages
- Verify your Sanity project ID and tokens are correct
- Make sure your Sanity dataset has content (if testing guides)

### Studio Doesn't Load

- Verify `NEXT_PUBLIC_SANITY_PROJECT_ID` is set
- Verify `NEXT_PUBLIC_SANITY_DATASET` is set
- Check browser console for errors

---

## 📋 Quick Checklist

Use this to track your progress:

- [ ] Step 1: Pushed code changes to Git
- [ ] Step 2: Gathered all environment variable values
- [ ] Step 3: Added `SANITY_PROJECT_ID` to Vercel
- [ ] Step 3: Added `NEXT_PUBLIC_SANITY_PROJECT_ID` to Vercel
- [ ] Step 3: Added `SANITY_DATASET` to Vercel
- [ ] Step 3: Added `NEXT_PUBLIC_SANITY_DATASET` to Vercel
- [ ] Step 3: Added `SANITY_API_READ_TOKEN` to Vercel
- [ ] Step 3: Added other required variables
- [ ] Step 4: Triggered new deployment
- [ ] Step 5: Build completed successfully
- [ ] Step 6: Tested deployment and pages work

---

## 🎯 Summary

**What we fixed:**
- Made Sanity config build-safe (won't fail during build)
- Validation now happens at runtime (when pages are accessed)
- Build will succeed even without env vars (but pages won't work without them)

**What you need to do:**
1. ✅ Push the code changes (Step 1)
2. ✅ Set environment variables in Vercel (Step 3)
3. ✅ Redeploy (Step 4)
4. ✅ Test (Step 6)

**Time estimate:** 15-30 minutes depending on how many variables you need to set up.

---

**Need help?** Check the build logs in Vercel for specific error messages and share them if you're stuck.

