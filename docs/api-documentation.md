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

**Last Updated:** January 2025
**API Version:** 1.0

