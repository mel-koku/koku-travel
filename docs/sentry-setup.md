# Sentry Error Tracking Setup

This guide explains how to set up Sentry for production error tracking in the Koku Travel application.

---

## Overview

Sentry integration is **optional** and will only activate when:
1. The `@sentry/nextjs` package is installed
2. Sentry DSN environment variables are configured

The application will continue to work normally without Sentry - errors will be logged to the console instead.

---

## Installation

### Step 1: Install Sentry Package

```bash
npm install @sentry/nextjs
```

### Step 2: Create Sentry Account

1. Sign up at [https://sentry.io](https://sentry.io)
2. Create a new project (select Next.js)
3. Copy your DSN from the project settings

### Step 3: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_RELEASE=1.0.0  # Optional: version/release identifier
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
```

### Step 4: Enable Sentry in next.config.ts

Uncomment the Sentry wrapper in `next.config.ts`:

```typescript
import { withSentryConfig } from "@sentry/nextjs";

// ... existing config ...

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
```

---

## Configuration Files

The following Sentry configuration files are already created:

- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking

These files automatically initialize Sentry when DSN is configured.

---

## Features

### Automatic Error Tracking

- **Error Boundary**: Errors caught by React error boundary are automatically sent to Sentry
- **Logger Integration**: Errors logged via `logger.error()` are sent to Sentry
- **Unhandled Exceptions**: Unhandled exceptions are automatically captured

### Performance Monitoring

- **Transaction Sampling**: 10% of transactions sampled in production
- **Profile Sampling**: 10% of profiles sampled in production
- **Session Replay**: 10% of sessions recorded, 100% on errors

### Security

- **Data Sanitization**: Sensitive data (passwords, tokens, etc.) is automatically redacted
- **Privacy**: Text content and media are masked in session replays
- **Filtering**: Browser extension errors are filtered out

---

## Usage

### Manual Error Reporting

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: "checkout" },
    extra: { userId: user.id },
  });
}
```

### Using the Logger

The centralized logger automatically sends errors to Sentry:

```typescript
import { logger } from "@/lib/logger";

logger.error("Something went wrong", error, {
  userId: user.id,
  action: "checkout",
});
```

### Setting User Context

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});
```

---

## Testing

### Test Error Tracking

1. Add a test error in development:

```typescript
// In any component or API route
if (process.env.NODE_ENV === "development") {
  throw new Error("Test error for Sentry");
}
```

2. Check your Sentry dashboard - the error should appear within seconds

### Verify Configuration

```bash
# Check if Sentry is configured
echo $NEXT_PUBLIC_SENTRY_DSN

# Build and test
npm run build
npm start
```

---

## Production Deployment

### Environment Variables

Make sure to set Sentry environment variables in your deployment platform:

**Vercel:**
- Go to Project Settings → Environment Variables
- Add all Sentry variables for Production environment

**Other Platforms:**
- Set environment variables according to your platform's documentation

### Source Maps

Sentry automatically uploads source maps during build when configured. This enables:
- Readable stack traces
- Better error context
- Easier debugging

---

## Monitoring

### Dashboard

Access your Sentry dashboard at:
- **URL**: `https://sentry.io/organizations/{org}/projects/{project}/`

### Alerts

Configure alerts in Sentry:
1. Go to Project Settings → Alerts
2. Create alert rules for:
   - New errors
   - Error rate spikes
   - Performance degradation

### Integrations

Sentry supports integrations with:
- Slack
- Email
- PagerDuty
- GitHub
- And more...

---

## Troubleshooting

### Sentry Not Capturing Errors

1. **Check DSN**: Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. **Check Package**: Ensure `@sentry/nextjs` is installed
3. **Check Config**: Verify `next.config.ts` has Sentry wrapper uncommented
4. **Check Console**: Look for Sentry initialization errors in browser console

### Too Many Events

- Adjust `tracesSampleRate` in config files (currently 0.1 = 10%)
- Adjust `replaysSessionSampleRate` for session replays
- Set up filters in Sentry dashboard

### Missing Source Maps

- Ensure `SENTRY_ORG` and `SENTRY_PROJECT` are set
- Check build logs for source map upload errors
- Verify Sentry auth token has correct permissions

---

## Best Practices

1. **Don't Log Sensitive Data**: Use the logger's sanitization or Sentry's `beforeSend` hook
2. **Set User Context**: Identify users for better error tracking
3. **Use Tags**: Add tags to categorize errors
4. **Set Release**: Track which version has errors
5. **Monitor Performance**: Use Sentry's performance monitoring features

---

## Disabling Sentry

To disable Sentry:

1. Remove or comment out Sentry DSN environment variables
2. Comment out Sentry wrapper in `next.config.ts`
3. Application will continue working with console logging only

---

## Additional Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)

---

**Last Updated:** 2024

