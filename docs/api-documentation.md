# API Documentation

This document describes all API routes available in the Koku Travel application.

---

## Base URL

All API routes are prefixed with `/api`:

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

---

## Authentication

Most API routes do not require authentication. However, some routes may implement rate limiting based on IP address.

---

## Rate Limiting

API routes implement rate limiting to prevent abuse:

- **Location endpoints**: 100 requests per minute per IP
- **Photo endpoints**: 200 requests per minute per IP

When rate limit is exceeded, the API returns:
- **Status Code**: `429 Too Many Requests`
- **Response Body**:
  ```json
  {
    "error": "Rate limit exceeded",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
  ```

---

## Error Responses

All API routes follow a consistent error response format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {}
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required or invalid
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - External service unavailable

---

## Endpoints

### 1. Get Location Details

**Endpoint:** `GET /api/locations/[id]`

**Description:** Retrieves detailed information about a specific location, including Google Places API data.

**Authentication:** Not required

**Rate Limit:** 100 requests/minute per IP

**Parameters:**

| Parameter | Type   | Location | Required | Description                    |
|-----------|--------|----------|----------|--------------------------------|
| `id`      | string | Path     | Yes      | Location ID (e.g., `tokyo-1`) |

**Request Example:**

```bash
curl https://your-domain.com/api/locations/tokyo-1
```

**Response Example:**

```json
{
  "location": {
    "id": "tokyo-1",
    "name": "Tokyo",
    "region": "Kanto",
    "coordinates": {
      "lat": 35.6762,
      "lng": 139.6503
    },
    "description": "Japan's bustling capital"
  },
  "details": {
    "placeId": "ChIJ51cu8IcbXWARiRtXIothAS4",
    "fetchedAt": "2024-01-15T10:30:00Z",
    "photos": [
      {
        "name": "photo-reference-123",
        "width": 4000,
        "height": 3000
      }
    ],
    "rating": 4.5,
    "userRatingsTotal": 1234,
    "formattedAddress": "Tokyo, Japan",
    "openingHours": {
      "openNow": true,
      "weekdayText": ["Monday: 9:00 AM – 5:00 PM", ...]
    }
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid location ID format
- `404 Not Found` - Location not found
- `503 Service Unavailable` - Google Places API not configured or unavailable
- `500 Internal Server Error` - Server error

**Caching:** Response is cached for 15 minutes (`max-age=900`)

---

### 2. Get Location Primary Photo

**Endpoint:** `GET /api/locations/[id]/primary-photo`

**Description:** Retrieves the primary photo reference for a location.

**Authentication:** Not required

**Rate Limit:** None (inherits from location endpoint)

**Parameters:**

| Parameter | Type   | Location | Required | Description                    |
|-----------|--------|----------|----------|--------------------------------|
| `id`      | string | Path     | Yes      | Location ID (e.g., `tokyo-1`) |

**Request Example:**

```bash
curl https://your-domain.com/api/locations/tokyo-1/primary-photo
```

**Response Example:**

```json
{
  "placeId": "ChIJ51cu8IcbXWARiRtXIothAS4",
  "fetchedAt": "2024-01-15T10:30:00Z",
  "photo": {
    "name": "photo-reference-123",
    "width": 4000,
    "height": 3000
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid location ID format
- `404 Not Found` - Location not found or no photo available
- `503 Service Unavailable` - Google Places API not configured
- `500 Internal Server Error` - Server error

**Caching:** Response is cached for 15 minutes (`max-age=900`)

---

### 3. Get Place Photo

**Endpoint:** `GET /api/places/photo`

**Description:** Retrieves a photo stream from Google Places API by photo reference name.

**Authentication:** Not required

**Rate Limit:** 200 requests/minute per IP

**Query Parameters:**

| Parameter    | Type    | Required | Default | Description                          |
|--------------|---------|----------|---------|--------------------------------------|
| `photoName`  | string  | Yes      | -       | Photo reference name from Places API |
| `maxWidthPx` | integer | No       | 4000    | Maximum width in pixels (max 4000)    |
| `maxHeightPx` | integer | No       | 4000    | Maximum height in pixels (max 4000)  |

**Request Example:**

```bash
curl "https://your-domain.com/api/places/photo?photoName=photo-reference-123&maxWidthPx=800&maxHeightPx=600"
```

**Response:**

- **Content-Type:** `image/jpeg` (or appropriate image type)
- **Status Code:** `200 OK`
- **Body:** Binary image data

**Error Responses:**

- `400 Bad Request` - Missing or invalid `photoName` parameter, or invalid dimension values
- `503 Service Unavailable` - Google Places API not configured
- `500 Internal Server Error` - Failed to fetch photo

**Caching:** Response is cached for 24 hours (`max-age=86400`)

**Notes:**

- Photo dimensions are validated to ensure they don't exceed 4000px
- Invalid dimension values default to 4000px maximum
- Photo names must match the format returned by Google Places API

---

### 4. Enable Preview Mode

**Endpoint:** `GET /api/preview`

**Description:** Enables Next.js draft mode for previewing unpublished Sanity content.

**Authentication:** Required via secret parameter

**Rate Limit:** None

**Query Parameters:**

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `secret`  | string | Yes      | Preview secret (must match `SANITY_PREVIEW_SECRET`) |
| `slug`    | string | Yes      | Path to redirect to after enabling preview     |

**Request Example:**

```bash
curl "https://your-domain.com/api/preview?secret=your-secret&slug=/guides/my-guide"
```

**Response:**

- **Status Code:** `302 Found` (redirects to the specified slug)
- Sets draft mode cookie

**Error Responses:**

- `400 Bad Request` - Missing `slug` parameter
- `401 Unauthorized` - Invalid or missing `secret`
- `500 Internal Server Error` - Preview secret not configured

**Usage:**

1. Visit the preview URL with valid secret and slug
2. Browser is redirected to the content page with draft mode enabled
3. Unpublished content from Sanity will be visible
4. Use `/api/preview/exit` to disable preview mode

---

### 5. Exit Preview Mode

**Endpoint:** `GET /api/preview/exit` or `POST /api/preview/exit`

**Description:** Disables Next.js draft mode and exits preview.

**Authentication:** Not required

**Rate Limit:** None

**Request Example:**

```bash
# GET request
curl https://your-domain.com/api/preview/exit

# POST request
curl -X POST "https://your-domain.com/api/preview/exit?redirectTo=/guides"
```

**Query Parameters (POST only):**

| Parameter   | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| `redirectTo` | string | No       | Path to redirect to after exit |

**Response (GET):**

- **Status Code:** `302 Found`
- Redirects to the referer URL or home page (`/`)

**Response (POST):**

```json
{
  "ok": true,
  "redirect": "/guides"
}
```

**Usage:**

- Visit `/api/preview/exit` to disable preview mode
- Browser is redirected back to the previous page or home
- Draft mode cookie is cleared

---

### 6. Revalidate Content

**Endpoint:** `POST /api/revalidate`

**Description:** Revalidates Next.js ISR cache for specific paths. Called by Sanity webhooks when content changes.

**Authentication:** Required via webhook signature

**Rate Limit:** None (webhook endpoint)

**Headers:**

| Header              | Type   | Required | Description                                    |
|---------------------|--------|----------|------------------------------------------------|
| `x-sanity-signature` | string | Yes      | HMAC signature of request body (validated against `SANITY_REVALIDATE_SECRET`) |
| `Content-Type`      | string | Yes      | Must be `application/json`                     |

**Request Body:**

```json
{
  "_type": "guide",
  "slug": {
    "current": "my-guide"
  },
  "paths": ["/guides", "/guides/my-guide"]
}
```

**Request Example:**

```bash
curl -X POST https://your-domain.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-sanity-signature: signature-here" \
  -d '{
    "_type": "guide",
    "slug": {"current": "my-guide"}
  }'
```

**Response:**

```json
{
  "revalidated": ["/guides", "/guides/my-guide"],
  "tags": ["guides"]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid JSON payload or missing required fields
- `401 Unauthorized` - Invalid or missing signature
- `503 Service Unavailable` - Revalidation secret not configured

**Path Normalization:**

The endpoint automatically normalizes paths:

- If `paths` array is provided, those paths are revalidated
- If `slug.current` is provided, `/guides` and `/guides/[slug]` are revalidated
- If `_type` is `guide`, `/guides` is added
- If no paths are provided, `/guides` is revalidated as default

**Usage:**

1. Configure Sanity webhook to call this endpoint on content changes
2. Webhook must include `x-sanity-signature` header with HMAC signature
3. Signature is validated against `SANITY_REVALIDATE_SECRET`
4. Matching paths are revalidated in Next.js ISR cache

---

## Data Models

### Location Object

```typescript
{
  id: string;
  name: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
}
```

### Location Details Object

```typescript
{
  placeId: string;
  fetchedAt: string; // ISO 8601 timestamp
  photos?: Array<{
    name: string;
    width: number;
    height: number;
  }>;
  rating?: number;
  userRatingsTotal?: number;
  formattedAddress?: string;
  openingHours?: {
    openNow: boolean;
    weekdayText?: string[];
  };
}
```

---

## Best Practices

1. **Caching**: Respect cache headers. Most endpoints cache responses for 15 minutes to 24 hours.

2. **Rate Limiting**: Implement client-side rate limiting to avoid hitting API limits.

3. **Error Handling**: Always check HTTP status codes and handle errors gracefully.

4. **Photo Optimization**: Use appropriate `maxWidthPx` and `maxHeightPx` parameters to optimize image sizes.

5. **Preview Mode**: Only use preview endpoints in development or with proper authentication.

---

## Support

For issues or questions about the API:

1. Check this documentation first
2. Review error messages for specific guidance
3. Check server logs for detailed error information
4. Open an issue in the repository

---

**Last Updated:** 2024  
**API Version:** 1.0

