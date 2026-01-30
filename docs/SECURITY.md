# Security Documentation

Security measures, best practices, and audit information for Koku Travel.

---

## Authentication & Authorization

### Implementation
- **Provider**: Supabase Auth
- **Method**: Email/password with secure session management
- **Sessions**: HTTP-only cookies via `@supabase/ssr`

### Security Measures
- Password hashing via Supabase (bcrypt)
- HTTP-only, Secure, SameSite cookies
- Server-side authentication checks
- Automatic session expiration

**Key Files:**
- `src/lib/auth/middleware.ts`
- `src/lib/supabase/server.ts`

---

## API Security

### Rate Limiting

**Production requires Redis** for distributed rate limiting.

| Endpoint | Limit |
|----------|-------|
| `/api/locations` | 100/min |
| `/api/places/*` | 60/min |
| `/api/itinerary/plan` | 20/min |
| `/api/itinerary/refine` | 30/min |
| `/api/routing/*` | 100/min |

Configure: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Input Validation

All routes use Zod schemas:
- `tripBuilderDataSchema` - Trip data validation
- `locationIdSchema` - Path traversal prevention
- `photoNameSchema` - Photo name validation

Sanitization utilities in `src/lib/api/sanitization.ts`:
- `sanitizePath()` - Prevents path traversal
- `sanitizeRedirectUrl()` - Prevents open redirects
- `sanitizeString()` - Removes dangerous characters

### Request Limits
- Default body: 1MB
- `/api/itinerary/refine`: 2MB
- Pagination: Max 100 items/page

---

## Environment Variables

### Server-Side Only (Never Expose)
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_PLACES_API_KEY`
- `ROUTING_MAPBOX_ACCESS_TOKEN`
- `UPSTASH_REDIS_REST_*`

### Client-Safe (`NEXT_PUBLIC_*`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Best Practices:**
- Never log API keys
- Rotate keys regularly
- Use API restrictions in cloud consoles
- Monitor usage for anomalies

---

## Security Headers

Configured in `next.config.ts`:

| Header | Purpose |
|--------|---------|
| `Strict-Transport-Security` | Forces HTTPS (1 year, includeSubdomains) |
| `X-Frame-Options` | Prevents clickjacking (SAMEORIGIN) |
| `X-Content-Type-Options` | Prevents MIME sniffing |
| `X-XSS-Protection` | XSS filtering |
| `Referrer-Policy` | Controls referrer info |
| `Permissions-Policy` | Restricts browser features |
| `Content-Security-Policy` | Restricts resource loading |

---

## Data Protection

### SQL Injection Prevention
- All queries use Supabase client (parameterized)
- No raw SQL with user input
- Type-safe query builders

### XSS Protection
- React auto-escapes JSX content
- CSP headers configured
- No `dangerouslySetInnerHTML` without sanitization

### Path Traversal Prevention
- All paths validated via `locationIdSchema`
- Patterns (`..`, `//`, `\`) rejected

### Open Redirect Prevention
- Only relative URLs allowed
- Absolute URLs rejected unless whitelisted
- Dangerous protocols blocked

---

## Error Handling

- Production errors are sanitized
- Stack traces never exposed to clients
- Detailed errors only in development
- Structured logging with request context

---

## External Services

### Supabase
- Row Level Security (RLS) enabled
- Service role key server-only
- Database migrations reviewed

### Google Places API
- API key restricted to domains/IPs
- Rate limiting implemented
- Responses cached

---

## Pre-Production Checklist

- [ ] All environment variables set
- [ ] Redis configured for rate limiting
- [ ] API keys have restrictions
- [ ] Security headers enabled
- [ ] Input validation on all routes
- [ ] HTTPS enforced
- [ ] `npm audit` clean
- [ ] RLS verified on tables

---

## Security Testing

1. **Penetration Testing**: Auth bypass, rate limits, injection
2. **Dependency Scanning**: `npm audit`, Dependabot
3. **Header Testing**: securityheaders.com
4. **Code Review**: Auth flows, API routes, error handling

---

## Incident Response

1. **Identify** - Detect security issue
2. **Contain** - Isolate affected systems
3. **Assess** - Determine scope/impact
4. **Remediate** - Fix vulnerability
5. **Document** - Record incident
6. **Notify** - Inform affected users if required

---

## Reporting Security Issues

1. **DO NOT** create public GitHub issues
2. Email security concerns to maintainers
3. Include reproduction steps
4. Allow time for fix before disclosure

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)

---

**Last Updated:** January 2026
