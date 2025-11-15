# Deployment Guide

This guide covers deploying the Koku Travel application to production environments.

---

## Prerequisites

- Node.js 18+ installed
- npm 10+ installed
- Access to deployment platform (Vercel, AWS, etc.)
- Environment variables configured
- Database migrations completed (if applicable)

---

## Environment Variables

### Required Variables

Copy `env.local.example` to `.env.local` and configure all required variables:

```bash
cp env.local.example .env.local
```

#### Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-side only
```

#### Sanity CMS Configuration

```bash
SANITY_PROJECT_ID=your_sanity_project_id
SANITY_DATASET=production
SANITY_API_READ_TOKEN=your_sanity_read_token
SANITY_API_WRITE_TOKEN=your_sanity_write_token  # Optional, for scripts
SANITY_PREVIEW_SECRET=your_random_preview_secret
SANITY_API_VERSION=2024-10-21
SANITY_REVALIDATE_SECRET=your_revalidate_secret
```

#### Optional Configuration

```bash
# Site URL (for image optimization)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Routing Provider (optional)
ROUTING_PROVIDER=mapbox
ROUTING_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Error Tracking (optional)
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```

### Environment Variable Validation

The application validates required environment variables at startup. Missing variables will cause the application to fail with clear error messages.

---

## Database Setup

### Supabase Migrations

If you have database migrations, run them before deployment:

```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase dashboard
# Navigate to SQL Editor and run migration files from supabase/migrations/
```

### Required Tables

Ensure the following tables exist:

- `profiles` - User profiles
- `favorites` - User favorites
- `guide_bookmarks` - Guide bookmarks
- `place_details` - Cached place details

Migration files are located in `supabase/migrations/`.

---

## Build Process

### Local Build Test

Test the build locally before deploying:

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Run tests
npm run test

# Build application
npm run build

# Test production build locally
npm start
```

### Build Configuration

The application uses Next.js 16 with:

- **Output**: Standalone (configurable in `next.config.ts`)
- **Image Optimization**: Enabled with remote patterns configured
- **Security Headers**: Configured in `next.config.ts`
- **TypeScript**: Strict mode enabled

---

## Deployment Platforms

### Vercel (Recommended)

Vercel provides seamless Next.js deployment:

1. **Connect Repository**
   - Import your GitHub/GitLab repository
   - Vercel will auto-detect Next.js

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables from `env.local.example`
   - Set variables for Production, Preview, and Development environments

3. **Deploy**
   - Push to `main` branch triggers production deployment
   - Pull requests create preview deployments automatically

4. **Custom Domain** (Optional)
   - Add custom domain in Project Settings → Domains
   - Configure DNS records as instructed

**Vercel Configuration:**

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

### AWS (EC2 / ECS / Lambda)

#### Using AWS Amplify

1. Connect repository to AWS Amplify
2. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
3. Add environment variables in Amplify console

### Other Platforms

The application can be deployed to any platform that supports Node.js:

- **Netlify**: Use Next.js plugin
- **Railway**: Auto-detects Next.js
- **Render**: Use Node.js service
- **DigitalOcean App Platform**: Use Node.js buildpack

---

## Post-Deployment Steps

### 1. Verify Deployment

- [ ] Check application loads at production URL
- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow
- [ ] Verify API routes are accessible
- [ ] Check image optimization works

### 2. Configure Sanity Webhook

Set up webhook in Sanity Studio to trigger revalidation:

1. Go to Sanity Project Settings → API → Webhooks
2. Create new webhook:
   - **URL**: `https://your-domain.com/api/revalidate`
   - **Dataset**: `production`
   - **Trigger on**: Create, Update, Delete
   - **Secret**: Use `SANITY_REVALIDATE_SECRET` value
   - **HTTP method**: POST
   - **API version**: `2024-10-21`

3. Test webhook by updating content in Sanity Studio

### 3. Set Up Monitoring

- [ ] Configure error tracking (Sentry, LogRocket, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure performance monitoring
- [ ] Set up log aggregation

### 4. Configure CDN (Optional)

For better performance:

- Use Vercel Edge Network (automatic with Vercel)
- Configure CloudFront (AWS)
- Set up Cloudflare CDN

### 5. SSL/TLS Certificate

- Vercel: Automatic HTTPS
- AWS: Use ACM (Certificate Manager)
- Other platforms: Follow platform-specific SSL setup

---

## Troubleshooting

### Build Failures

**Issue:** Build fails with TypeScript errors

**Solution:**
```bash
# Run type check locally
npx tsc --noEmit

# Fix type errors before deploying
```

**Issue:** Build fails due to missing environment variables

**Solution:**
- Ensure all required environment variables are set in deployment platform
- Check variable names match exactly (case-sensitive)
- Verify no typos in variable values

### Runtime Errors

**Issue:** Application crashes on startup

**Solution:**
- Check server logs for specific error messages
- Verify all environment variables are set
- Check database connectivity
- Verify API keys are valid

**Issue:** Images not loading

**Solution:**
- Verify `NEXT_PUBLIC_SITE_URL` is set correctly
- Check image domain is in `remotePatterns` in `next.config.ts`
- Verify image optimization is enabled

**Issue:** API routes return 500 errors

**Solution:**
- Check server logs for detailed error messages
- Verify API keys (Google Places, Supabase, Sanity) are valid
- Check rate limiting isn't blocking legitimate requests
- Verify database migrations are applied

### Performance Issues

**Issue:** Slow page loads

**Solution:**
- Enable Next.js Image Optimization
- Check CDN configuration
- Review Web Vitals metrics
- Optimize database queries
- Enable caching headers

**Issue:** High memory usage

**Solution:**
- Review server logs for memory leaks
- Check for excessive API calls
- Optimize image sizes
- Review bundle size

---

## Rollback Procedures

### Vercel

1. Go to Deployments tab
2. Find previous successful deployment
3. Click "..." menu → "Promote to Production"

### AWS

1. Tag previous working version
2. Update deployment to use previous version
3. Monitor for stability

### General Rollback Steps

1. **Identify Issue**: Check error logs and monitoring
2. **Stop Bad Deployment**: Pause or disable current deployment
3. **Revert Code**: Revert to previous commit or deployment
4. **Redeploy**: Deploy previous version
5. **Verify**: Test that rollback resolved the issue
6. **Document**: Record what went wrong and how it was fixed

---

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies (`npm audit`, `npm update`)
- **Quarterly**: Review and update security headers
- **As Needed**: Database migrations and schema updates

### Dependency Updates

Use Dependabot (configured in `.github/dependabot.yml`) for automated dependency updates:

- Review PRs created by Dependabot
- Test updates in preview environment
- Merge after verification

### Database Backups

- Supabase: Automatic backups enabled by default
- Verify backup retention policy
- Test restore procedures periodically

---

## Security Checklist

Before going to production:

- [ ] All environment variables are set and secure
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to client
- [ ] Security headers are configured
- [ ] Rate limiting is enabled on API routes
- [ ] HTTPS is enforced (HSTS header)
- [ ] Content Security Policy is configured
- [ ] Error messages don't expose sensitive information
- [ ] API keys are rotated regularly
- [ ] Dependencies are up-to-date (`npm audit`)
- [ ] Database migrations are tested
- [ ] Webhook secrets are strong and unique

---

## Performance Optimization

### Build Optimizations

- Optimize bundle size (review imports)
- Enable tree-shaking
- Use dynamic imports for heavy components

### Runtime Optimizations

- Enable ISR (Incremental Static Regeneration) where appropriate
- Configure appropriate cache headers
- Optimize images (use Next.js Image component)
- Enable compression (gzip/brotli)

### Monitoring

- Track Core Web Vitals (LCP, FID, CLS)
- Monitor API response times
- Track error rates
- Monitor database query performance

---

## Support

For deployment issues:

1. Check this guide first
2. Review platform-specific documentation
3. Check application logs
4. Review error tracking service (if configured)
5. Open an issue in the repository

---

**Last Updated:** 2024  
**Deployment Version:** 1.0

