# Vercel Environment Variables Setup Guide

Use this guide to fill out your Vercel Environment Variables form.

## Step-by-Step Instructions

### 1. Set Environment Scope
- Click the "All Environments" dropdown
- Select **"Production, Preview, and Development"** (or set individually for each)

### 2. Add Required Variables

Add these variables one by one using the "+ Add Another" button:

#### **Supabase Configuration** (Required)
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co
```
*Get from: Supabase Dashboard → Project Settings → API → Project URL*

```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: your_anon_key_here
```
*Get from: Supabase Dashboard → Project Settings → API → anon/public key*

```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: your_service_role_key_here
```
*Get from: Supabase Dashboard → Project Settings → API → service_role key (keep secret!)*
**⚠️ Enable "Sensitive" toggle for this one!**

---

#### **Sanity CMS - Server-side** (Required)
```
Key: SANITY_PROJECT_ID
Value: your_sanity_project_id
```
*Get from: Sanity Dashboard → Project Settings → Project ID*

```
Key: SANITY_DATASET
Value: production
```
*Usually "production" unless you have a different dataset name*

```
Key: SANITY_API_READ_TOKEN
Value: your_sanity_read_token
```
*Get from: Sanity Dashboard → Project Settings → API → Tokens → Create new read token*

```
Key: SANITY_API_VERSION
Value: 2024-10-21
```
*Fixed value - use exactly this*

```
Key: SANITY_REVALIDATE_SECRET
Value: [generate random string]
```
*Generate using: `openssl rand -hex 32` or any random string generator*
**⚠️ Enable "Sensitive" toggle for this one!**

---

#### **Sanity CMS - Client-side** (Required for Studio)
```
Key: NEXT_PUBLIC_SANITY_PROJECT_ID
Value: your_sanity_project_id
```
*Same as SANITY_PROJECT_ID above*

```
Key: NEXT_PUBLIC_SANITY_DATASET
Value: production
```
*Same as SANITY_DATASET above*

```
Key: NEXT_PUBLIC_SANITY_API_VERSION
Value: 2025-11-13
```
*Fixed value - use exactly this*

---

### 3. Add Optional Variables

#### **Site URL** (Set after first deployment)
```
Key: NEXT_PUBLIC_SITE_URL
Value: https://your-project.vercel.app
```
*Set this AFTER your first deployment with your actual Vercel URL*

---

#### **Sanity Optional Variables** (If using preview/write features)
```
Key: SANITY_API_WRITE_TOKEN
Value: your_sanity_write_token
```
*Get from: Sanity Dashboard → Project Settings → API → Tokens → Create new write token*
**⚠️ Enable "Sensitive" toggle for this one!**

```
Key: SANITY_PREVIEW_SECRET
Value: [generate random string]
```
*Generate using: `openssl rand -hex 32`*
**⚠️ Enable "Sensitive" toggle for this one!**

---

#### **Mapbox Routing** (Optional)
```
Key: ROUTING_PROVIDER
Value: mapbox
```

```
Key: ROUTING_MAPBOX_ACCESS_TOKEN
Value: your_mapbox_access_token
```
*Get from: Mapbox Account → Access Tokens*

---

#### **Sentry Error Tracking** (Optional)
```
Key: NEXT_PUBLIC_SENTRY_DSN
Value: https://your-dsn@sentry.io/project-id
```

```
Key: SENTRY_DSN
Value: https://your-dsn@sentry.io/project-id
```

```
Key: SENTRY_ORG
Value: your-org-slug
```

```
Key: SENTRY_PROJECT
Value: your-project-slug
```

```
Key: NEXT_PUBLIC_ENABLE_ERROR_TRACKING
Value: true
```

---

## Quick Checklist

### Required Variables (11 total)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Sensitive
- [ ] `SANITY_PROJECT_ID`
- [ ] `SANITY_DATASET`
- [ ] `SANITY_API_READ_TOKEN`
- [ ] `SANITY_API_VERSION`
- [ ] `SANITY_REVALIDATE_SECRET` ⚠️ Sensitive
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID`
- [ ] `NEXT_PUBLIC_SANITY_DATASET`
- [ ] `NEXT_PUBLIC_SANITY_API_VERSION`

### Sensitive Variables (Enable "Sensitive" toggle)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SANITY_REVALIDATE_SECRET`
- `SANITY_API_WRITE_TOKEN` (if using)
- `SANITY_PREVIEW_SECRET` (if using)

## After Adding Variables

1. ✅ Click "Save" button
2. ✅ Redeploy your project (Vercel will automatically redeploy, or trigger manually)
3. ✅ Verify deployment succeeds
4. ✅ Set `NEXT_PUBLIC_SITE_URL` after first successful deployment

## Troubleshooting

- **Build fails?** Check that all required variables are set
- **Sanity Studio not working?** Verify all `NEXT_PUBLIC_SANITY_*` variables are set
- **API routes failing?** Check server-side Sanity variables (`SANITY_*` without `NEXT_PUBLIC_`)
- **Case sensitivity:** Variable names are case-sensitive - match exactly!

