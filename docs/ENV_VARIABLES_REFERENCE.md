# Environment Variables Reference

This document lists all environment variables needed for Vercel deployment. Use this as a reference when setting up your Vercel project.

## Required Variables

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```
**Where to find:**
- Supabase Dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` is in the same section (keep secret!)

### Sanity CMS Configuration
```bash
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_READ_TOKEN=your_read_token
SANITY_API_WRITE_TOKEN=your_write_token
SANITY_PREVIEW_SECRET=generate_random_string_here
SANITY_API_VERSION=2024-10-21
SANITY_REVALIDATE_SECRET=generate_random_string_here
```
**Where to find:**
- Sanity Dashboard → Project Settings → API
- For tokens: Project Settings → API → Tokens
- Generate secrets: Use a random string generator or `openssl rand -hex 32`

### Site URL (Set After First Deploy)
```bash
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
```
**Note:** Set this AFTER your first deployment to get your actual Vercel URL.

## Optional Variables

### Mapbox Routing (Optional)
```bash
ROUTING_PROVIDER=mapbox
ROUTING_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```
**Where to find:**
- Mapbox Account → Access Tokens

### Sentry Error Tracking (Optional)
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```
**Where to find:**
- Sentry Dashboard → Project Settings → Client Keys (DSN)

## Quick Copy-Paste Template

Copy this template and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sanity
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_PREVIEW_SECRET=
SANITY_API_VERSION=2024-10-21
SANITY_REVALIDATE_SECRET=

# Site URL (set after first deploy)
NEXT_PUBLIC_SITE_URL=

# Optional: Mapbox
ROUTING_PROVIDER=mapbox
ROUTING_MAPBOX_ACCESS_TOKEN=

# Optional: Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```

## Security Notes

1. **Never commit** `.env.local` to Git
2. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in client-side code
3. **Use strong secrets** for `SANITY_PREVIEW_SECRET` and `SANITY_REVALIDATE_SECRET`
4. **Rotate keys regularly** for production environments
5. **Use different credentials** for production vs. development

## Generating Random Secrets

You can generate random secrets using:

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using online generator
# Visit: https://randomkeygen.com/
```

## Verifying Variables

After setting variables in Vercel:
1. Go to Project Settings → Environment Variables
2. Verify all variables are set for the correct environment
3. Check variable names match exactly (case-sensitive)
4. Redeploy after adding new variables

