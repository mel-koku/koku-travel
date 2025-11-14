# Vercel Deployment Plan - Next Steps

## ✅ What's Already Done

- ✅ Code is committed and pushed to GitHub
- ✅ Build succeeds locally (`npm run build`)
- ✅ Linting errors fixed
- ✅ Repository ready: `mel-koku/koku-travel`

---

## 🎯 Your Next Steps

### Step 1: Push Latest Changes (If Not Done)
```bash
git push origin main
```

### Step 2: Gather Your Environment Variables

Before deploying, collect these values. Check your `.env.local` file or service dashboards:

#### Required Variables:

**Supabase** (from Supabase Dashboard → Project Settings → API):
- `NEXT_PUBLIC_SUPABASE_URL` - Your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)

**Sanity** (from Sanity Dashboard → Project Settings → API):
- `SANITY_PROJECT_ID` - Your project ID
- `SANITY_DATASET` - Usually `production`
- `SANITY_API_READ_TOKEN` - Read token
- `SANITY_API_WRITE_TOKEN` - Write token (optional)
- `SANITY_PREVIEW_SECRET` - Generate random string: `openssl rand -hex 32`
- `SANITY_API_VERSION` - `2024-10-21`
- `SANITY_REVALIDATE_SECRET` - Generate random string: `openssl rand -hex 32`

**Site URL** (set AFTER first deploy):
- `NEXT_PUBLIC_SITE_URL` - Will be your Vercel URL

#### Optional Variables:
- `ROUTING_PROVIDER=mapbox` + `ROUTING_MAPBOX_ACCESS_TOKEN` (if using Mapbox)
- Sentry variables (if using error tracking)

### Step 3: Deploy to Vercel

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign up/Login (use GitHub for easy integration)

2. **Import Your Project:**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `mel-koku/koku-travel`
   - Vercel will auto-detect Next.js ✅

3. **Configure Environment Variables:**
   - Before clicking "Deploy", go to "Environment Variables" section
   - Add ALL required variables listed above
   - Set each variable for **Production** environment
   - ⚠️ **Important:** Don't set `NEXT_PUBLIC_SITE_URL` yet - we'll do this after first deploy

4. **Deploy:**
   - Click "Deploy" button
   - Watch the build logs (should take 2-3 minutes)
   - Wait for deployment to complete ✅

5. **Get Your URL:**
   - After deployment succeeds, copy your Vercel URL
   - Example: `https://koku-travel-abc123.vercel.app`

### Step 4: Update Site URL

After first deployment:
1. Go to **Project Settings → Environment Variables**
2. Add `NEXT_PUBLIC_SITE_URL` = `https://your-actual-url.vercel.app`
3. Set for **Production** environment
4. Redeploy (or wait for next push)

### Step 5: Verify Deployment

Test these after deployment:
- [ ] App loads at your Vercel URL without errors
- [ ] No console errors in browser
- [ ] Authentication works (sign up/login)
- [ ] Content loads from Sanity CMS
- [ ] Images display correctly
- [ ] API routes respond

### Step 6: Configure Sanity Webhook (Optional but Recommended)

For content revalidation when you update Sanity content:

1. Go to **Sanity Dashboard → Project Settings → API → Webhooks**
2. Create new webhook:
   - **URL:** `https://your-project.vercel.app/api/revalidate`
   - **Dataset:** `production`
   - **Secret:** Your `SANITY_REVALIDATE_SECRET` value
   - **Trigger on:** Create, Update, Delete
   - **HTTP method:** POST
   - **API version:** `2024-10-21`
3. Test by updating content in Sanity Studio

---

## 🚨 Quick Reference

**Your Repository:** `https://github.com/mel-koku/koku-travel`

**Required Services:**
- Supabase (database/auth)
- Sanity (CMS)

**Deployment Platform:**
- Vercel (https://vercel.com)

**Time Estimate:** 15-20 minutes

---

## ❓ Troubleshooting

**Build Fails?**
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `npm run build` works locally

**Environment Variables Not Working?**
- Check variable names are exact (case-sensitive)
- Ensure variables are set for correct environment
- Redeploy after adding variables

**Need Help?**
- Check `docs/deployment-guide.md` for detailed troubleshooting
- Review Vercel's Next.js documentation

---

## ✅ Checklist

- [ ] Pushed latest code to GitHub
- [ ] Gathered all environment variables
- [ ] Created Vercel account
- [ ] Imported project to Vercel
- [ ] Set all environment variables in Vercel
- [ ] Deployed successfully
- [ ] Updated `NEXT_PUBLIC_SITE_URL` after first deploy
- [ ] Verified app works
- [ ] Configured Sanity webhook (optional)

---

**You're ready! Start with Step 1 and work through each step. Good luck! 🚀**

