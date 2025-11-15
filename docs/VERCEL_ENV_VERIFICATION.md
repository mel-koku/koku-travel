# Vercel Environment Variables Verification Guide

This guide helps you verify that all required environment variables are correctly set in your Vercel deployment.

## Quick Verification Steps

### Step 1: Run the Verification Script

```bash
npx tsx scripts/verify-env-vars.ts
```

This will:
- Check your local `.env.local` file
- Show which variables are set/missing
- Provide detailed instructions for Vercel

### Step 2: Verify in Vercel Dashboard

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Log in with your GitHub account

2. **Select Your Project:**
   - Click on **"koku-travel"** project

3. **Navigate to Environment Variables:**
   - Click **"Settings"** (gear icon)
   - Click **"Environment Variables"** in the sidebar

4. **Verify Each Variable:**

   For each variable below, check:
   - ✅ Variable name matches exactly (case-sensitive!)
   - ✅ Value is set (not empty)
   - ✅ Value doesn't contain placeholder text
   - ✅ Scope includes **Production** environment
   - ✅ Sensitive variables are marked as "Sensitive"

## Required Variables (11 total)

### Supabase Configuration (3 variables)

#### 1. `NEXT_PUBLIC_SUPABASE_URL`
- **Description:** Your Supabase project URL
- **Example:** `https://xxxxx.supabase.co`
- **Where to find:** Supabase Dashboard → Project Settings → API → Project URL
- **Sensitive:** No
- **Scope:** Production, Preview, Development

#### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Description:** Supabase anonymous/public key (safe to expose client-side)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find:** Supabase Dashboard → Project Settings → API → anon public key
- **Sensitive:** No
- **Scope:** Production, Preview, Development

#### 3. `SUPABASE_SERVICE_ROLE_KEY`
- **Description:** Supabase service role key (server-side only, NEVER expose client-side)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find:** Supabase Dashboard → Project Settings → API → service_role secret key
- **Sensitive:** ⚠️ **YES - Mark as "Sensitive"**
- **Scope:** Production, Preview, Development

---

### Sanity CMS - Server-side (5 variables)

#### 4. `SANITY_PROJECT_ID`
- **Description:** Your Sanity project ID
- **Example:** `abc123xyz`
- **Where to find:** Sanity Dashboard → Project Settings → Project ID
- **Sensitive:** No
- **Scope:** Production, Preview, Development

#### 5. `SANITY_DATASET`
- **Description:** Sanity dataset name (usually "production")
- **Example:** `production`
- **Where to find:** Sanity Dashboard → Datasets
- **Sensitive:** No
- **Scope:** Production, Preview, Development

#### 6. `SANITY_API_READ_TOKEN`
- **Description:** Sanity API read token (read-only access)
- **Example:** `skAbCdEfGhIjKlMnOpQrStUvWxYz...`
- **Where to find:** Sanity Dashboard → Project Settings → API → Tokens → Create Read Token
- **Sensitive:** ⚠️ **YES - Mark as "Sensitive"**
- **Scope:** Production, Preview, Development

#### 7. `SANITY_API_VERSION`
- **Description:** Sanity API version (fixed value)
- **Example:** `2024-10-21`
- **Where to find:** Fixed value - use exactly: `2024-10-21`
- **Sensitive:** No
- **Scope:** Production, Preview, Development

#### 8. `SANITY_REVALIDATE_SECRET`
- **Description:** Secret for webhook revalidation
- **Example:** `a1b2c3d4e5f6...` (random string)
- **Where to find:** Generate with: `openssl rand -hex 32`
- **Sensitive:** ⚠️ **YES - Mark as "Sensitive"**
- **Scope:** Production, Preview, Development

---

### Sanity CMS - Client-side (3 variables)

#### 9. `NEXT_PUBLIC_SANITY_PROJECT_ID`
- **Description:** Sanity project ID (client-side, same as `SANITY_PROJECT_ID`)
- **Example:** `abc123xyz`
- **Where to find:** Same value as `SANITY_PROJECT_ID` above
- **Sensitive:** No
- **Scope:** Production, Preview, Development

#### 10. `NEXT_PUBLIC_SANITY_DATASET`
- **Description:** Sanity dataset name (client-side, same as `SANITY_DATASET`)
- **Example:** `production`
- **Where to find:** Same value as `SANITY_DATASET` above
- **Sensitive:** No
- **Scope:** Production, Preview, Development

#### 11. `NEXT_PUBLIC_SANITY_API_VERSION`
- **Description:** Sanity API version (client-side)
- **Example:** `2024-10-21` or `2025-11-13` (check docs)
- **Where to find:** Fixed value - use exactly: `2024-10-21` or `2025-11-13`
- **Sensitive:** No
- **Scope:** Production, Preview, Development

---

## Optional Variables

### `NEXT_PUBLIC_SITE_URL`
- **Description:** Your site URL (set after first deployment)
- **Example:** `https://koku-travel.vercel.app`
- **When to set:** After your first successful Vercel deployment
- **Sensitive:** No

### Other Optional Variables
See `env.local.example` for complete list of optional variables (Google APIs, Mapbox, Sentry, etc.)

---

## Verification Checklist

Use this checklist to verify each variable:

- [ ] **Variable Name:** Matches exactly (case-sensitive, no typos)
- [ ] **Value:** Set and not empty
- [ ] **Value:** Doesn't contain placeholder text (`your_`, `https://your`)
- [ ] **Sensitive:** Marked as "Sensitive" if required
- [ ] **Scope:** Includes Production environment
- [ ] **All 11 required variables:** Present in Vercel

### After Adding/Updating Variables

- [ ] Clicked "Save" button
- [ ] New deployment triggered (automatic or manual)
- [ ] Build logs checked for errors
- [ ] Site tested at https://koku-travel.vercel.app
- [ ] Browser console checked (no missing variable errors)

---

## Common Issues & Solutions

### Issue: "Missing required environment variable" error

**Possible causes:**
1. Variable not set in Vercel
2. Variable set for wrong environment (e.g., only Preview, not Production)
3. Typo in variable name
4. Variables added after build (need new deployment)

**Solutions:**
1. ✅ Verify variable exists in Vercel Dashboard
2. ✅ Check environment scope includes Production
3. ✅ Verify exact spelling (case-sensitive)
4. ✅ Trigger new deployment after adding variables

### Issue: Variables set but still getting errors

**Check:**
1. Are variables set for **Production** environment?
2. Did you trigger a **new deployment** after adding variables?
3. Are there any **typos** in variable names?
4. Do values contain **extra spaces or quotes**?

### Issue: Build succeeds but runtime errors

**This means:**
- `NEXT_PUBLIC_*` variables weren't embedded during build
- Variables were added after the build
- **Solution:** Trigger a new deployment

---

## Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Environment Variables:** Settings → Environment Variables
- **Deployments:** Deployments tab → Redeploy
- **Build Logs:** Click on any deployment → View build logs

---

## Testing After Setup

1. **Check Build Logs:**
   - Go to Deployments → Latest deployment
   - Verify build succeeded
   - Check for any environment variable warnings

2. **Test Your Site:**
   - Visit: https://koku-travel.vercel.app
   - Open browser console (F12)
   - Check for any errors

3. **Verify Features:**
   - Test Supabase features (if applicable)
   - Test Sanity CMS content loading
   - Check API routes work

---

## Need Help?

If you're still experiencing issues:

1. Run the verification script: `npx tsx scripts/verify-env-vars.ts`
2. Double-check variable names (case-sensitive!)
3. Verify environment scope includes Production
4. Trigger a fresh deployment
5. Check build logs for specific errors

---

**Last Updated:** 2025-01-27

