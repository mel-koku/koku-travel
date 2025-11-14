# Vercel Configuration Quick Check

## ✅ Current Status

**Local Git Configuration:**
- ✅ Repository: `git@github.com:mel-koku/koku-travel.git`
- ✅ Matches expected: `mel-koku/koku-travel`
- ℹ️  Current branch: `feat/production-readiness-fixes` (production branch: `main`)

**Vercel CLI:**
- ✅ Installed: v48.10.0
- ⚠️  Not logged in (run `vercel login` to enable CLI verification)

---

## 🚀 Quick Verification Methods

### Method 1: Vercel Dashboard (Recommended - No Login Required)

1. **Open Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Log in with your GitHub account

2. **Select Your Project:**
   - Find and click on **"koku-travel"** project

3. **Check Git Settings:**
   - Click **"Settings"** (gear icon in top navigation)
   - Scroll to **"Git"** section
   - Verify:
     ```
     ✅ Repository: mel-koku/koku-travel
     ✅ Production Branch: main
     ✅ Root Directory: ./ (or blank)
     ```

4. **Check Latest Deployment:**
   - Go to **"Deployments"** tab
   - Click on the latest deployment
   - In the build logs, look for:
     ```
     Cloning github.com/mel-koku/koku-travel.git
     ```
   - Verify the commit hash matches your GitHub repository

---

### Method 2: Vercel CLI (After Login)

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Link Project (if not already linked):**
   ```bash
   vercel link
   ```
   - Select your existing project: `koku-travel`
   - Confirm settings

3. **Run Verification Script:**
   ```bash
   node scripts/check-vercel-repo.js
   ```
   or
   ```bash
   ./scripts/verify-vercel-config.sh
   ```

4. **Inspect Project Details:**
   ```bash
   vercel inspect
   ```

5. **Check Project List:**
   ```bash
   vercel project ls
   ```

---

## 🔍 What to Verify

### ✅ Repository Connection
- **Should be:** `mel-koku/koku-travel` or `https://github.com/mel-koku/koku-travel.git`
- **Check in:** Settings → Git → Repository

### ✅ Production Branch
- **Should be:** `main`
- **Check in:** Settings → Git → Production Branch

### ✅ Root Directory
- **Should be:** `./` or blank (defaults to root)
- **Check in:** Settings → Git → Root Directory

### ✅ Build Settings (Auto-detected, but verify)
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm ci` or `npm install`

---

## 🐛 If Repository is Wrong

### Fix via Dashboard:

1. Go to **Settings → Git**
2. Click **"Disconnect"** (if connected to wrong repo)
3. Click **"Connect Git Repository"**
4. Select **GitHub** as provider
5. Search for: `mel-koku/koku-travel`
6. Click **"Connect"**
7. Verify settings are correct
8. Vercel will automatically redeploy

### Fix via CLI:

```bash
# Link to correct project
vercel link

# Select: mel-koku/koku-travel
# Confirm all settings
```

---

## 📊 Verification Checklist

- [ ] Repository URL matches `mel-koku/koku-travel`
- [ ] Production branch is set to `main`
- [ ] Root directory is `./` or blank
- [ ] Latest deployment shows correct repository in build logs
- [ ] Latest deployment commit hash matches GitHub `main` branch
- [ ] Build succeeds without errors
- [ ] App is accessible at Vercel URL

---

## 🔗 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repository:** https://github.com/mel-koku/koku-travel
- **Vercel Project Settings:** https://vercel.com/dashboard → Select Project → Settings → Git

---

## 📝 Notes

- Vercel automatically deploys when you push to the production branch (`main`)
- Preview deployments are created for pull requests
- Environment variables are set separately in Settings → Environment Variables
- Build logs show the exact repository and commit being deployed

---

**Last Verified:** $(date)  
**Status:** Ready for verification

