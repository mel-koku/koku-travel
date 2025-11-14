# Vercel Repository Verification Guide

This guide helps you verify that Vercel is deploying from the correct GitHub repository: `https://github.com/mel-koku/koku-travel.git`

## ✅ Current Local Repository Status

**Repository URL:** `git@github.com:mel-koku/koku-travel.git` ✅  
**HTTPS Equivalent:** `https://github.com/mel-koku/koku-travel.git` ✅  
**Current Branch:** `feat/production-readiness-fixes`  
**Default Branch:** `main` (remotes/origin/HEAD -> origin/main)

---

## 🔍 How to Verify in Vercel Dashboard

### Step 1: Access Your Vercel Project

1. Go to [vercel.com](https://vercel.com) and log in
2. Navigate to your **Dashboard**
3. Find and click on your **koku-travel** project

### Step 2: Check Repository Connection

1. Click on **Settings** (gear icon) in the project navigation
2. Scroll down to the **Git** section
3. Verify the following:

#### ✅ Repository URL Should Be:
```
https://github.com/mel-koku/koku-travel
```
or
```
git@github.com:mel-koku/koku-travel.git
```

Both formats point to the same repository, so either is correct.

#### ✅ Production Branch Should Be:
```
main
```

This is the branch that Vercel will deploy to production.

#### ✅ Root Directory Should Be:
```
./
```
or left blank (defaults to root)

---

## 🔧 How to Update Repository Connection (If Wrong)

If the repository URL is incorrect:

1. In **Settings → Git** section
2. Click **Disconnect** (if connected to wrong repo)
3. Click **Connect Git Repository**
4. Select **GitHub** as your Git provider
5. Search for and select: `mel-koku/koku-travel`
6. Click **Connect**
7. Verify the repository URL matches: `mel-koku/koku-travel`

---

## 📋 Verification Checklist

Use this checklist to ensure everything is configured correctly:

- [ ] **Repository URL** matches `mel-koku/koku-travel` or `https://github.com/mel-koku/koku-travel.git`
- [ ] **Production Branch** is set to `main`
- [ ] **Root Directory** is `./` or blank
- [ ] **Build Command** is `npm run build` (auto-detected)
- [ ] **Output Directory** is `.next` (auto-detected)
- [ ] **Install Command** is `npm ci` or `npm install` (auto-detected)
- [ ] **Framework Preset** is `Next.js` (auto-detected)

---

## 🚨 Common Issues

### Issue: Repository shows different owner/organization

**Solution:**
- Make sure you're logged into the correct GitHub account in Vercel
- Check that you have access to `mel-koku/koku-travel` repository
- If needed, disconnect and reconnect the repository

### Issue: Production branch is not `main`

**Solution:**
1. Go to **Settings → Git**
2. Under **Production Branch**, change it to `main`
3. Save changes
4. Vercel will redeploy from the `main` branch

### Issue: Deployments are coming from wrong branch

**Solution:**
- Check **Settings → Git → Production Branch** is set to `main`
- Verify your `main` branch is up to date: `git push origin main`
- Check deployment history to see which branch triggered each deployment

---

## 🔄 How to Ensure Main Branch is Up to Date

Before verifying Vercel, make sure your `main` branch has the latest code:

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# If you have changes on your current branch that should be in main:
# 1. Merge your feature branch into main
git merge feat/production-readiness-fixes

# 2. Push to GitHub
git push origin main
```

---

## 📊 Verify via Vercel CLI (Optional)

If you have Vercel CLI installed and authenticated:

```bash
# Login to Vercel
vercel login

# Link to your project (if not already linked)
vercel link

# Check project info
vercel project ls

# Check current project details
vercel inspect
```

---

## ✅ Final Verification Steps

After confirming the repository connection:

1. **Trigger a Manual Deployment:**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push a commit to `main` branch to trigger automatic deployment

2. **Check Deployment Logs:**
   - Open the latest deployment
   - Check the **Build Logs** tab
   - Verify it's pulling from the correct repository
   - Look for: `Cloning github.com/mel-koku/koku-travel.git`

3. **Verify Deployment URL:**
   - Check that your app is accessible at the Vercel URL
   - Test key functionality to ensure it's deploying the correct code

---

## 📝 Quick Reference

**Repository:** `https://github.com/mel-koku/koku-travel.git`  
**Production Branch:** `main`  
**Vercel Dashboard:** https://vercel.com/dashboard  
**GitHub Repository:** https://github.com/mel-koku/koku-travel

---

**Last Updated:** $(date)  
**Status:** Ready for verification

