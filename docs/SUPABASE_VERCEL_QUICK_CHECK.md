# Supabase-Vercel Quick Verification Guide

**Purpose:** Quick checklist to verify Supabase is properly linked to your Vercel live deployment.

---

## 🚀 5-Minute Verification

### Step 1: Check Vercel Environment Variables (2 min)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your **koku-travel** project

2. **Navigate to Environment Variables:**
   - Click **Settings** → **Environment Variables**

3. **Verify These 3 Variables Exist:**

   ```
   ✅ NEXT_PUBLIC_SUPABASE_URL
      Value: https://xxxxx.supabase.co
      Environment: Production, Preview, Development
   
   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
      Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      Environment: Production, Preview, Development
   
   ✅ SUPABASE_SERVICE_ROLE_KEY
      Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      Environment: Production, Preview, Development
      ⚠️ MUST be marked as "Sensitive"
   ```

4. **If Missing:**
   - Click **"Add New"**
   - Copy values from your `.env.local` file
   - Set environment scope (at minimum: Production)
   - For `SUPABASE_SERVICE_ROLE_KEY`, enable **"Sensitive"** toggle
   - Click **"Save"**
   - **Redeploy** your project

---

### Step 2: Test Health Endpoint (1 min)

1. **Get Your Vercel URL:**
   - From Vercel Dashboard → Deployments → Latest deployment
   - Example: `https://koku-travel-abc123.vercel.app`

2. **Test Health Endpoint:**
   ```bash
   curl https://your-project.vercel.app/api/health
   ```

   **Expected Response:**
   ```json
   {
     "status": "healthy",
     "services": {
       "supabase": {
         "status": "healthy"
       },
       "sanity": {
         "status": "healthy"
       }
     }
   }
   ```

   **If Supabase is Unhealthy:**
   - Check error message in response
   - Verify environment variables are correct
   - Check Supabase project status in Supabase dashboard

---

### Step 3: Test Locations API (1 min)

```bash
curl https://your-project.vercel.app/api/locations
```

**Expected Response:**
```json
{
  "locations": [
    {
      "id": "...",
      "name": "...",
      "region": "...",
      ...
    }
  ]
}
```

**If It Fails:**
- Check browser console for errors
- Verify database migrations have been applied
- Check Supabase dashboard → Table Editor → `locations` table exists

---

### Step 4: Check Browser Console (1 min)

1. **Open Your Live Site:**
   - Visit your Vercel deployment URL in browser
   - Open Developer Tools (F12)

2. **Check Console:**
   - Look for any Supabase-related errors
   - Look for CSP (Content Security Policy) violations
   - Should see no errors related to Supabase

3. **Check Network Tab:**
   - Filter by "supabase"
   - Verify API calls to `*.supabase.co` are successful
   - Status codes should be 200 or 201

---

## ✅ Quick Checklist

- [ ] All 3 Supabase environment variables set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` marked as "Sensitive"
- [ ] Health endpoint returns `"supabase": {"status": "healthy"}`
- [ ] Locations API returns data successfully
- [ ] No errors in browser console
- [ ] Supabase API calls succeed in Network tab

---

## 🐛 Common Issues

### Issue: "Supabase status: unhealthy"
**Check:**
1. Environment variables are set correctly
2. Supabase project URL is correct (no trailing slash)
3. Anon key is correct (starts with `eyJ...`)
4. Database migrations have been applied

**Fix:**
- Double-check variable values in Vercel
- Re-apply migrations: `supabase db push`
- Redeploy Vercel project

### Issue: "SUPABASE_SERVICE_ROLE_KEY is not configured"
**Check:**
- Variable exists in Vercel environment variables
- Variable is set for correct environment (Production/Preview)

**Fix:**
- Add variable if missing
- Redeploy project

### Issue: CSP Violations in Console
**Check:**
- `next.config.ts` includes `https://*.supabase.co` in `connect-src`

**Fix:**
- Verify CSP configuration in `next.config.ts`
- Redeploy project

---

## 📞 Need Help?

- **Full Review:** See `docs/SUPABASE_VERCEL_REVIEW.md`
- **Environment Setup:** See `docs/VERCEL_ENV_SETUP.md`
- **Deployment Guide:** See `docs/VERCEL_DEPLOYMENT_CHECKLIST.md`

---

**Last Updated:** November 2024

