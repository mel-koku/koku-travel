# Deployment Guide

Complete guide for deploying Koku Travel to production.

---

## Quick Start (Vercel)

### 1. Prerequisites
- Node.js 18+, npm 10+
- GitHub repository connected
- Environment variables ready

### 2. Deploy Steps

```bash
# Test build locally first
npm ci && npm run build

# Push to GitHub
git push origin main
```

1. Go to [vercel.com](https://vercel.com), import your GitHub repo
2. Add environment variables (see below)
3. Deploy - Vercel auto-detects Next.js

### 3. Post-Deploy
- Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL
- Redeploy to apply

---

## Environment Variables

### Required

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | Supabase Dashboard |
| `UPSTASH_REDIS_REST_URL` | Redis URL for rate limiting | [Upstash Console](https://console.upstash.com/) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis token | Upstash Console |

### Optional

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Your production URL |
| `GOOGLE_PLACES_API_KEY` | Google Places API |
| `ROUTING_MAPBOX_ACCESS_TOKEN` | Mapbox routing |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Client-side maps |

---

## Database Setup

### Apply Migrations

```bash
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

### Required Tables
- `trips` - Trip persistence
- `favorites` - User favorites
- `guide_bookmarks` - Guide bookmarks
- `day_entry_points` - Day entry points

### Verify RLS

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('trips', 'favorites');
-- All should have rowsecurity = true
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `GET /api/trips` | 100/min |
| `POST /api/trips` | 30/min |
| `POST /api/itinerary/plan` | 20/min |
| `GET /api/locations` | 100/min |

---

## Deployment Platforms

### Vercel (Recommended)
- Auto-detects Next.js
- Preview deployments on PRs
- Automatic HTTPS

### AWS Amplify
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands: [npm ci]
    build:
      commands: [npm run build]
  artifacts:
    baseDirectory: .next
    files: ['**/*']
```

### Other Platforms
Netlify, Railway, Render, DigitalOcean all support Next.js.

---

## Verification Checklist

### Pre-Deploy
- [ ] `npm run build` succeeds locally
- [ ] All environment variables set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` marked sensitive
- [ ] Database migrations applied
- [ ] Redis configured for rate limiting

### Post-Deploy
- [ ] App loads without errors
- [ ] Authentication works
- [ ] API routes respond (`/api/health`)
- [ ] Images load correctly
- [ ] Rate limit headers present

### Test Commands
```bash
# Health check
curl https://your-domain.com/api/health

# Rate limit headers
curl -I https://your-domain.com/api/trips -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Build Fails
- Check all env vars are set (case-sensitive)
- Run `npx tsc --noEmit` locally
- Verify `npm run build` works locally

### Images Not Loading
- Set `NEXT_PUBLIC_SITE_URL` correctly
- Check `remotePatterns` in `next.config.ts`

### API Returns 500
- Check server logs
- Verify API keys are valid
- Check database connectivity

### Rate Limiting Not Working
- Verify Redis env vars are set
- Check logs for "Redis rate limiting enabled"

---

## Rollback

### Vercel
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### General
1. Identify issue in logs
2. Revert to previous commit
3. Redeploy
4. Document what went wrong

---

## Maintenance

- **Weekly**: Review error logs
- **Monthly**: `npm audit`, update dependencies
- **Quarterly**: Review security headers

---

**Last Updated:** January 2026
