# Security Documentation

This document outlines security measures, best practices, and requirements for the Koku Travel application.

## API Key Management

### Environment Variables

All API keys and sensitive credentials are stored in environment variables and never committed to version control.

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL (safe to expose client-side)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase anonymous key (safe to expose client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only, never exposed)

**Optional Environment Variables:**
- `GOOGLE_PLACES_API_KEY` - Google Places API key (server-side only)
- `ROUTING_GOOGLE_MAPS_API_KEY` - Google Maps API key (server-side only)
- `ROUTING_MAPBOX_ACCESS_TOKEN` - Mapbox access token (server-side only)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL (server-side only)
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token (server-side only)

### API Key Exposure Prevention

- ✅ All server-side API keys use environment variables without `NEXT_PUBLIC_` prefix
- ✅ Client-side code only uses `NEXT_PUBLIC_*` variables
- ✅ Google Places API calls are made server-side only
- ✅ API routes validate and sanitize all inputs before making external API calls

**Best Practices:**
- Never log API keys or sensitive credentials
- Rotate API keys regularly
- Use API key restrictions in Google Cloud Console / Mapbox dashboard
- Monitor API usage for unusual patterns

## Rate Limiting

### Production Requirements

**Redis is REQUIRED in production** for proper rate limiting across multiple server instances.

In-memory rate limiting does NOT work correctly with:
- Multiple server instances (Vercel, Kubernetes, etc.)
- Serverless functions that scale horizontally
- Edge functions

**Configuration:**
- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production
- Rate limiting will log errors if Redis is not configured in production
- Development mode allows in-memory fallback

**Rate Limits:**
- `/api/locations`: 100 requests/minute per IP
- `/api/places/*`: 60 requests/minute per IP
- `/api/itinerary/plan`: 20 requests/minute per IP
- `/api/itinerary/refine`: 30 requests/minute per IP
- `/api/routing/*`: 100 requests/minute per IP

## Input Validation

### Zod Schemas

All API routes use Zod schemas for input validation:

- ✅ `tripBuilderDataSchema` - Comprehensive validation for trip builder data
- ✅ `locationIdSchema` - Validates location IDs with path traversal prevention
- ✅ `photoNameSchema` - Validates Google Places photo names
- ✅ `tripIdSchema` - Validates trip IDs
- ✅ All schemas include length limits, character restrictions, and type validation

### Sanitization

User input is sanitized using utilities in `src/lib/api/sanitization.ts`:

- `sanitizePath()` - Prevents path traversal attacks
- `sanitizeRedirectUrl()` - Prevents open redirect attacks
- `sanitizeString()` - Removes dangerous characters
- `isSafeIdentifier()` - Validates safe identifiers

## Authentication

### Current Implementation

- Most API routes use `getOptionalAuth()` for optional authentication
- User-specific features (favorites, bookmarks) require authentication
- Trip data is stored client-side (localStorage) - not yet synced to server

### Future Enhancements

- Add authentication requirements for trip persistence endpoints
- Implement role-based access control (RBAC) if needed
- Add session timeout handling
- Implement refresh token rotation

## XSS Protection

### React Built-in Protection

- ✅ React automatically escapes content in JSX
- ✅ User input is never directly inserted as HTML
- ✅ All form inputs use controlled components

### Content Security Policy (CSP)

CSP headers are configured in `next.config.ts`:
- Script sources are restricted
- Inline scripts require nonces (production)
- External resources are whitelisted

### Best Practices

- Never use `dangerouslySetInnerHTML` without sanitization
- Validate and sanitize all user-generated content
- Use React's built-in escaping for all text content

## SQL Injection Prevention

### Supabase Client

- ✅ All database queries use Supabase client methods (parameterized queries)
- ✅ No raw SQL queries with user input
- ✅ Query builders prevent SQL injection automatically

### Best Practices

- Never construct SQL queries with string concatenation
- Always use Supabase query builder methods
- Validate input before database operations

## Path Traversal Prevention

### Validation

- All path parameters are validated using `locationIdSchema` or `sanitizePath()`
- Path traversal patterns (`..`, `//`, `\`) are rejected
- File system access is restricted to safe directories

## Open Redirect Prevention

### Redirect URL Validation

- All redirect URLs are validated using `redirectUrlSchema`
- Only relative URLs (starting with `/`) are allowed
- Absolute URLs are rejected unless explicitly whitelisted
- Dangerous protocols (`javascript:`, `data:`, etc.) are blocked

## Request Size Limits

### Body Size Limits

- Default: 1MB per request
- `/api/itinerary/plan`: 1MB
- `/api/itinerary/refine`: 2MB
- All limits are enforced before parsing JSON

### Query Parameter Limits

- Maximum query string length: Browser-dependent (typically 2048 characters)
- Pagination limits: Max 100 items per page

## Error Handling

### Information Disclosure Prevention

- Production error messages are sanitized
- Detailed error information is only shown in development
- Stack traces are never exposed to clients
- Error logging includes request context for debugging

## Security Headers

### Headers Configuration

Security headers are configured in `next.config.ts`:

- `Strict-Transport-Security` - Enforces HTTPS
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `X-XSS-Protection` - XSS protection
- `Referrer-Policy` - Controls referrer information
- `Permissions-Policy` - Restricts browser features
- `Content-Security-Policy` - Restricts resource loading

## Monitoring & Logging

### Security Events

The following events should be monitored:

- Rate limit violations
- Authentication failures
- Invalid input validation failures
- API key usage anomalies
- Unusual request patterns

### Logging

- All security-relevant events are logged using `logger`
- Sensitive data is never logged
- Request IDs are included for tracing

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] Redis is configured for rate limiting
- [ ] API keys have proper restrictions
- [ ] Security headers are enabled
- [ ] Error messages are sanitized
- [ ] Input validation is enabled on all routes
- [ ] Authentication is required for protected routes
- [ ] CSP headers are configured
- [ ] HTTPS is enforced
- [ ] Database backups are configured

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to the maintainers
3. Include steps to reproduce the issue
4. Allow time for the issue to be addressed before public disclosure

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
