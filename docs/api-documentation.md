# API Documentation

This document describes all API routes available in the Koku Travel application.

---

## Base URL

All API routes are prefixed with `/api`:

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

---

## Authentication

Most public API routes do not require authentication. However, user-specific routes (like trips) require authentication via Supabase Auth.

**Authenticated endpoints** return `401 Unauthorized` if no valid session is present.

---

## Rate Limiting

API routes implement rate limiting to prevent abuse:

- **Location endpoints**: 100 requests per minute per IP
- **Photo endpoints**: 200 requests per minute per IP
- **Trips endpoints**:
  - GET /api/trips: 100 requests per minute
  - POST /api/trips: 30 requests per minute
  - GET /api/trips/[id]: 100 requests per minute
  - PATCH /api/trips/[id]: 60 requests per minute
  - DELETE /api/trips/[id]: 30 requests per minute
- **Itinerary endpoints**: 20-30 requests per minute

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

**Description:** Retrieves detailed information about a specific location from the database. All data is pre-enriched during location ingestion, so no external API calls are made at runtime.

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
    "displayName": "Tokyo",
    "fetchedAt": "2024-01-15T10:30:00Z",
    "photos": [
      {
        "name": "primary",
        "proxyUrl": "https://..."
      }
    ],
    "rating": 4.5,
    "userRatingCount": 1234,
    "formattedAddress": "Tokyo, Kanto",
    "editorialSummary": "Japan's bustling capital...",
    "regularOpeningHours": ["Monday: 9:00 – 17:00", ...],
    "reviews": []
  }
}
```

**Notes:**
- `photos` contains only the primary photo (photo gallery removed for cost optimization)
- `reviews` is always an empty array (reviews removed for cost optimization)
- Rating and review count are cached from enrichment

**Error Responses:**

- `400 Bad Request` - Invalid location ID format
- `404 Not Found` - Location not found

**Caching:** Response is cached for 1 hour (`max-age=3600`)

---

### 2. Get Location Primary Photo

**Endpoint:** `GET /api/locations/[id]/primary-photo`

**Description:** Retrieves the primary photo for a location from the database. Uses pre-enriched `primary_photo_url` field, falling back to the location's default image if not available.

**Authentication:** Not required

**Rate Limit:** 100 requests/minute per IP

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
    "name": "primary",
    "proxyUrl": "https://...",
    "attributions": []
  },
  "displayName": "Tokyo",
  "editorialSummary": "Japan's bustling capital..."
}
```

**Error Responses:**

- `400 Bad Request` - Invalid location ID format
- `404 Not Found` - Location not found

**Caching:** Response is cached for 1 hour (`max-age=3600`)

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

### 4. List User Trips

**Endpoint:** `GET /api/trips`

**Description:** Retrieves all trips for the authenticated user.

**Authentication:** Required (Supabase Auth)

**Rate Limit:** 100 requests/minute per user

**Request Example:**

```bash
curl https://your-domain.com/api/trips \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Example:**

```json
{
  "trips": [
    {
      "id": "3621634c-b128-4e8d-b944-ccc33628c3fe",
      "name": "Kobe & Osaka Trip - Jan 26",
      "createdAt": "2026-01-25T06:52:06.935Z",
      "updatedAt": "2026-01-25T06:52:11.656Z",
      "itinerary": { "days": [...] },
      "builderData": { ... }
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `401 Unauthorized` - Authentication required
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 5. Create Trip

**Endpoint:** `POST /api/trips`

**Description:** Creates a new trip for the authenticated user.

**Authentication:** Required (Supabase Auth)

**Rate Limit:** 30 requests/minute per user

**Request Body:**

| Field        | Type   | Required | Description                     |
|--------------|--------|----------|---------------------------------|
| `id`         | string | No       | UUID (auto-generated if omitted)|
| `name`       | string | No       | Trip name (default: "Untitled itinerary") |
| `itinerary`  | object | No       | Itinerary data (default: `{days: []}`) |
| `builderData`| object | No       | Builder configuration (default: `{}`) |

**Request Example:**

```bash
curl -X POST https://your-domain.com/api/trips \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Japan Trip", "itinerary": {"days": []}, "builderData": {}}'
```

**Response Example:**

```json
{
  "trip": {
    "id": "3621634c-b128-4e8d-b944-ccc33628c3fe",
    "name": "My Japan Trip",
    "createdAt": "2026-01-25T06:52:06.935Z",
    "updatedAt": "2026-01-25T06:52:06.935Z",
    "itinerary": { "days": [] },
    "builderData": {}
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Authentication required
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 6. Get Trip by ID

**Endpoint:** `GET /api/trips/[id]`

**Description:** Retrieves a specific trip by ID for the authenticated user.

**Authentication:** Required (Supabase Auth)

**Rate Limit:** 100 requests/minute per user

**Parameters:**

| Parameter | Type   | Location | Required | Description |
|-----------|--------|----------|----------|-------------|
| `id`      | string | Path     | Yes      | Trip UUID   |

**Request Example:**

```bash
curl https://your-domain.com/api/trips/3621634c-b128-4e8d-b944-ccc33628c3fe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Example:**

```json
{
  "trip": {
    "id": "3621634c-b128-4e8d-b944-ccc33628c3fe",
    "name": "Kobe & Osaka Trip - Jan 26",
    "createdAt": "2026-01-25T06:52:06.935Z",
    "updatedAt": "2026-01-25T06:52:11.656Z",
    "itinerary": { "days": [...] },
    "builderData": { ... }
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid trip ID format
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Trip not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 7. Update Trip

**Endpoint:** `PATCH /api/trips/[id]`

**Description:** Updates a trip for the authenticated user.

**Authentication:** Required (Supabase Auth)

**Rate Limit:** 60 requests/minute per user

**Parameters:**

| Parameter | Type   | Location | Required | Description |
|-----------|--------|----------|----------|-------------|
| `id`      | string | Path     | Yes      | Trip UUID   |

**Request Body (all fields optional):**

| Field        | Type   | Description                     |
|--------------|--------|---------------------------------|
| `name`       | string | Updated trip name               |
| `itinerary`  | object | Updated itinerary data          |
| `builderData`| object | Updated builder configuration   |

**Request Example:**

```bash
curl -X PATCH https://your-domain.com/api/trips/3621634c-b128-4e8d-b944-ccc33628c3fe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Trip Name"}'
```

**Response Example:**

```json
{
  "trip": {
    "id": "3621634c-b128-4e8d-b944-ccc33628c3fe",
    "name": "Updated Trip Name",
    "createdAt": "2026-01-25T06:52:06.935Z",
    "updatedAt": "2026-01-25T07:30:00.000Z",
    "itinerary": { "days": [...] },
    "builderData": { ... }
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body or no updates provided
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Trip not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 8. Delete Trip

**Endpoint:** `DELETE /api/trips/[id]`

**Description:** Soft deletes a trip for the authenticated user. Sets `deleted_at` timestamp rather than permanently removing.

**Authentication:** Required (Supabase Auth)

**Rate Limit:** 30 requests/minute per user

**Parameters:**

| Parameter | Type   | Location | Required | Description |
|-----------|--------|----------|----------|-------------|
| `id`      | string | Path     | Yes      | Trip UUID   |

**Request Example:**

```bash
curl -X DELETE https://your-domain.com/api/trips/3621634c-b128-4e8d-b944-ccc33628c3fe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Example:**

```json
{
  "success": true
}
```

**Error Responses:**

- `400 Bad Request` - Invalid trip ID format
- `401 Unauthorized` - Authentication required
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

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
  displayName?: string;
  fetchedAt: string; // ISO 8601 timestamp
  photos: Array<{        // Contains only primary photo (for cost optimization)
    name: string;
    proxyUrl: string;
    attributions: Array<{
      displayName?: string;
      uri?: string;
    }>;
  }>;
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  editorialSummary?: string;
  regularOpeningHours?: string[];  // Pre-formatted from database
  reviews: [];           // Always empty (reviews removed for cost optimization)
}
```

### StoredTrip Object

```typescript
{
  id: string;           // UUID
  name: string;         // Trip name
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
  itinerary: {
    days: Array<{
      id: string;
      date: string;
      activities: Array<{
        id: string;
        locationId: string;
        startTime: string;
        endTime: string;
        // ... activity details
      }>;
    }>;
  };
  builderData: {
    duration?: number;
    dates?: { start?: string; end?: string };
    regions?: string[];
    cities?: string[];
    interests?: string[];
    style?: "relaxed" | "balanced" | "fast";
    // ... other builder configuration
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

**Last Updated:** January 2026
**API Version:** 1.1

