# API Reference

This document describes all available API endpoints in the Hypercaller application.

## Base URL

All API endpoints are relative to the base URL:
- **Development**: `http://localhost:3000`
- **Production**: Your production domain

## Authentication Endpoints

### Send OTP

Send a one-time password (OTP) to a phone number for verification.

**Endpoint**: `POST /api/auth/send-otp`

**Request Body**:
```json
{
  "phoneNumber": "+15551234567"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456"  // Only in development mode
}
```

**Response** (Error - 400):
```json
{
  "error": "Phone number already registered"
}
```

**Response** (Error - 500):
```json
{
  "error": "Failed to send OTP"
}
```

**Notes**:
- Phone number will be normalized to E.164 format
- OTP is displayed in response only when `NODE_ENV=development`
- OTP expires after 10 minutes (handled by DynamoDB TTL)

---

### Verify OTP

Verify the OTP code sent to a phone number.

**Endpoint**: `POST /api/auth/verify-otp`

**Request Body**:
```json
{
  "phoneNumber": "+15551234567",
  "otp": "123456"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Response** (Error - 400):
```json
{
  "error": "Invalid or expired OTP"
}
```

**Response** (Error - 500):
```json
{
  "error": "OTP verification failed"
}
```

**Notes**:
- OTP must be verified within 10 minutes of creation
- Once verified, the OTP can be used for registration

---

### Check Username Availability

Check if a username is available for registration.

**Endpoint**: `POST /api/auth/check-username`

**Request Body**:
```json
{
  "username": "johndoe"
}
```

**Response** (Available - 200):
```json
{
  "available": true,
  "message": "Username is available"
}
```

**Response** (Taken - 200):
```json
{
  "available": false,
  "message": "Username already taken"
}
```

**Response** (Error - 400):
```json
{
  "error": "Username is required"
}
```

**Notes**:
- Username is normalized to lowercase
- Username must be 3-20 characters, alphanumeric and underscore only

---

### Register User

Complete user registration after OTP verification.

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "phoneNumber": "+15551234567",
  "password": "password123",
  "role": "user",
  "avatar": "avatar1"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "userId": "user_1234567890",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "avatar": "avatar1"
  },
  "session": {
    "sessionId": "session_1234567890",
    "expiresAt": 1234567890
  }
}
```

**Response** (Error - 400):
```json
{
  "error": "All fields are required"
}
```

```json
{
  "error": "Please verify your phone number with OTP first"
}
```

```json
{
  "error": "Username already taken"
}
```

```json
{
  "error": "Password must be at least 8 characters"
}
```

**Validation Rules**:
- All fields are required
- Phone number must be verified with OTP within the last 10 minutes
- Username must be available and meet format requirements
- Password must be at least 8 characters
- Role must be either "user" or "business"

---

### Login

Authenticate a user with username and password.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "username": "johndoe",
  "password": "password123",
  "rememberMe": false
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "userId": "user_1234567890",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "avatar": "avatar1"
  },
  "session": {
    "sessionId": "session_1234567890",
    "expiresAt": 1234567890
  }
}
```

**Response** (Error - 400):
```json
{
  "error": "Username and password are required"
}
```

**Response** (Error - 401):
```json
{
  "error": "Invalid credentials"
}
```

**Response** (Error - 403):
```json
{
  "error": "Account is suspended. Please contact support."
}
```

```json
{
  "error": "Phone number not verified. Please complete registration."
}
```

**Notes**:
- Session expires after 1 day (default) or 30 days (if `rememberMe` is true)
- Session ID should be stored client-side for subsequent authenticated requests

---

### Get Session

Validate and retrieve current session information.

**Endpoint**: `GET /api/auth/session`

**Headers**:
```
Cookie: sessionId=session_1234567890
```

**Response** (Valid Session - 200):
```json
{
  "valid": true,
  "user": {
    "userId": "user_1234567890",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "avatar": "avatar1"
  },
  "session": {
    "sessionId": "session_1234567890",
    "expiresAt": 1234567890
  }
}
```

**Response** (Invalid Session - 401):
```json
{
  "valid": false,
  "error": "Invalid or expired session"
}
```

---

### Logout

Invalidate the current session.

**Endpoint**: `POST /api/auth/logout`

**Headers**:
```
Cookie: sessionId=session_1234567890
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Profile Endpoints

### Get User Profile

Retrieve the current authenticated user's profile information.

**Endpoint**: `GET /api/profile`

**Headers**:
```
x-session-id: session_1234567890
```

**Response** (Success - 200):
```json
{
  "success": true,
  "user": {
    "userId": "user_1234567890",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+15551234567",
    "role": "user",
    "avatar": "avatar1",
    "address": "123 Main St, City, State",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "locationLastUpdated": 1234567890,
    "createdAt": 1234567890,
    "lastLoginAt": 1234567890,
    "preferredCategories": ["restaurant", "cafe"]
  }
}
```

**Response** (Error - 401):
```json
{
  "error": "Session ID required"
}
```

**Response** (Error - 404):
```json
{
  "error": "User not found"
}
```

**Notes**:
- Requires authentication
- Returns user profile excluding sensitive data (password hash)
- Includes preferred categories if set

---

### Update User Profile

Update the current authenticated user's profile information including location, name, avatar, and preferred categories.

**Endpoint**: `PUT /api/profile`

**Headers**:
```
x-session-id: session_1234567890
Content-Type: application/json
```

**Request Body** (Location Update - Current Location):
```json
{
  "useCurrentLocation": true,
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Request Body** (Location Update - Manual Address):
```json
{
  "manualAddress": "123 Main St, New York, NY"
}
```

**Request Body** (Profile Update):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "avatar2",
  "preferredCategories": ["restaurant", "cafe", "gym"]
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "userId": "user_1234567890",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+15551234567",
    "role": "user",
    "avatar": "avatar2",
    "address": "123 Main St, New York, NY",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "locationLastUpdated": 1234567890,
    "preferredCategories": ["restaurant", "cafe", "gym"]
  }
}
```

**Response** (Error - 400):
```json
{
  "error": "Failed to get address from location. Please try again."
}
```

```json
{
  "error": "Failed to find location for this address. Please check the address and try again."
}
```

**Notes**:
- Requires authentication
- Location updates trigger geocoding (reverse for coordinates, forward for addresses)
- Preferred categories replace existing categories if provided as an array
- All fields are optional - only provided fields will be updated

---

## Saved Businesses Endpoints

### Get Saved Businesses

Retrieve all businesses saved by the current user, or check if a specific business is saved.

**Endpoint**: `GET /api/profile/saved-businesses`

**Headers**:
```
x-session-id: session_1234567890
```

**Query Parameters**:
- `businessId` (optional): Check if a specific business is saved
- `limit` (optional): Number of results per page (default: 25)
- `cursor` (optional): Pagination cursor

**Response** (Check Specific Business - 200):
```json
{
  "success": true,
  "isSaved": true
}
```

**Response** (List All Saved Businesses - 200):
```json
{
  "success": true,
  "items": [
    {
      "userId": "user_1234567890",
      "businessId": "business_123",
      "business": {
        "businessId": "business_123",
        "name": "Example Restaurant",
        "description": "A great place to eat",
        "category": "restaurant",
        "location": {
          "address": "123 Main St",
          "city": "New York",
          "state": "NY",
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "contact": {
          "phone": "+15551234567",
          "website": "https://example.com"
        },
        "rating": 4.5,
        "reviewCount": 100,
        "priceRange": "$$"
      },
      "savedAt": 1234567890,
      "note": null,
      "tags": [],
      "source": "manual"
    }
  ],
  "nextCursor": "cursor_string",
  "hasMore": true
}
```

**Response** (Error - 401):
```json
{
  "error": "Session ID required"
}
```

**Notes**:
- Requires authentication
- If `businessId` is provided, returns a quick check response
- Otherwise, returns paginated list of saved businesses
- Results include full business data stored at save time

---

### Save Business

Save a business to the user's saved list.

**Endpoint**: `POST /api/profile/saved-businesses`

**Headers**:
```
x-session-id: session_1234567890
Content-Type: application/json
```

**Request Body**:
```json
{
  "businessId": "business_123",
  "business": {
    "businessId": "business_123",
    "name": "Example Restaurant",
    "description": "A great place to eat",
    "category": "restaurant",
    "location": {
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "contact": {
      "phone": "+15551234567",
      "website": "https://example.com"
    },
    "rating": 4.5,
    "reviewCount": 100,
    "priceRange": "$$",
    "images": ["https://example.com/image.jpg"],
    "logo": "https://example.com/logo.jpg"
  },
  "note": "Great for date night",
  "tags": ["favorite", "dinner"],
  "source": "manual"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "item": {
    "userId": "user_1234567890",
    "businessId": "business_123",
    "business": { /* business data */ },
    "savedAt": 1234567890,
    "note": "Great for date night",
    "tags": ["favorite", "dinner"],
    "source": "manual"
  }
}
```

**Response** (Error - 400):
```json
{
  "error": "businessId is required"
}
```

**Response** (Error - 409):
```json
{
  "error": "Business already saved"
}
```

**Response** (Error - 500):
```json
{
  "error": "Failed to save business",
  "details": "Database table not found. Please contact support."
}
```

**Notes**:
- Requires authentication
- Business data is stored at save time (snapshot)
- `note`, `tags`, and `source` are optional
- Returns 409 if business is already saved
- Business data should include all relevant fields for display

---

### Remove Saved Business

Remove a business from the user's saved list.

**Endpoint**: `DELETE /api/profile/saved-businesses?businessId=business_123`

**Headers**:
```
x-session-id: session_1234567890
```

**Query Parameters**:
- `businessId` (required): ID of the business to remove

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Business removed from saved list"
}
```

**Response** (Error - 400):
```json
{
  "error": "businessId is required"
}
```

**Response** (Error - 404):
```json
{
  "error": "Business not found in saved list"
}
```

**Notes**:
- Requires authentication
- Returns 404 if business is not in saved list

---

## Search Endpoints

### Search Businesses

Perform a business search with natural language processing, semantic search, and filtering capabilities.

**Endpoint**: `POST /api/search`

**Headers**:
```
Content-Type: application/json
x-session-id: session_1234567890  // Optional - for search history
```

**Request Body**:
```json
{
  "query": "best Italian restaurants near me",
  "filters": {
    "category": "restaurant",
    "location": {
      "lat": 40.7128,
      "lng": -74.0060,
      "radius": 5000
    },
    "minRating": 4.0,
    "priceRange": "$$"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "query": "best Italian restaurants near me",
  "location": {
    "used": "New York, NY",
    "source": "profile",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    },
    "city": "New York",
    "state": "NY",
    "radius": 5000
  },
  "results": [
    {
      "businessId": "business_123",
      "name": "Example Italian Restaurant",
      "description": "Authentic Italian cuisine",
      "category": "restaurant",
      "location": {
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "rating": 4.5,
      "reviewCount": 100,
      "priceRange": "$$",
      "distance": 500,
      "distanceKm": 0.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasMore": true
  },
  "analysis": {
    "intent": "search",
    "category": "restaurant",
    "entities": {
      "cuisine": "Italian",
      "location": "near me"
    }
  },
  "performance": {
    "responseTime": 1250,
    "fromCache": false,
    "steps": ["nlp", "embedding", "semantic_search", "keyword_search", "ranking"],
    "bedrockApiCalls": 2,
    "cacheHits": 1
  }
}
```

**Response** (Error - 400):
```json
{
  "success": false,
  "query": "best Italian restaurants",
  "error": "Query is required",
  "performance": {
    "responseTime": 50,
    "fromCache": false
  }
}
```

**Response** (Error - 500):
```json
{
  "success": false,
  "query": "best Italian restaurants",
  "error": "Search failed",
  "errorCode": "SEARCH_ERROR",
  "action": "Please try again",
  "performance": {
    "responseTime": 5000,
    "fromCache": false,
    "errors": ["Bedrock API timeout"]
  },
  "partialResults": true
}
```

**Notes**:
- Query processing uses AWS Bedrock for NLP and embeddings
- Supports hybrid search (semantic + keyword)
- Location can be extracted from query, user profile, geolocation, or IP
- Results are ranked by relevance, distance, and rating
- Performance metrics included in response
- Search history is recorded if user is authenticated

---

## Search History Endpoints

### Get Search History

Retrieve the user's search history.

**Endpoint**: `GET /api/search/history`

**Headers**:
```
x-session-id: session_1234567890
```

**Query Parameters**:
- `limit` (optional): Number of results (default: 20, max: 50)
- `cursor` (optional): Pagination cursor

**Response** (Success - 200):
```json
{
  "success": true,
  "items": [
    {
      "userId": "user_1234567890",
      "query": "best Italian restaurants",
      "filters": {
        "category": "restaurant"
      },
      "location": {
        "city": "New York",
        "state": "NY"
      },
      "resultCount": 25,
      "searchedAt": 1234567890
    }
  ],
  "nextCursor": 1234567890
}
```

**Response** (Error - 401):
```json
{
  "error": "Session ID required"
}
```

**Notes**:
- Requires authentication
- Returns paginated results sorted by most recent first
- Includes query, filters, location, and result count

---

### Record Search History

Record a search query in the user's search history.

**Endpoint**: `POST /api/search/history`

**Headers**:
```
x-session-id: session_1234567890
Content-Type: application/json
```

**Request Body**:
```json
{
  "query": "best Italian restaurants",
  "filters": {
    "category": "restaurant",
    "minRating": 4.0
  },
  "location": {
    "city": "New York",
    "state": "NY",
    "lat": 40.7128,
    "lng": -74.0060
  },
  "resultCount": 25
}
```

**Response** (Success - 200):
```json
{
  "success": true
}
```

**Response** (Error - 400):
```json
{
  "error": "Query is required"
}
```

**Notes**:
- Requires authentication
- All fields except `query` are optional
- Used internally by search endpoint but can be called separately

---

## Embeddings Endpoints

### Get Embedding Status

Check the status of business embeddings generation.

**Endpoint**: `GET /api/embeddings/status`

**Response** (Success - 200):
```json
{
  "success": true,
  "totalBusinesses": 1000,
  "embeddedBusinesses": 950,
  "pendingBusinesses": 50,
  "status": "in_progress"
}
```

**Notes**:
- Public endpoint (no authentication required)
- Returns overall status of embedding generation process

---

## Google Authentication (Optional)

### Initiate Google OAuth

**Endpoint**: `GET /api/auth/google`

Redirects to Google OAuth consent screen.

### Google OAuth Callback

**Endpoint**: `GET /api/auth/google/callback`

Handles Google OAuth callback and creates user session.

**Query Parameters**:
- `code`: OAuth authorization code from Google

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**:
```json
{
  "error": "Error message describing what went wrong"
}
```

**401 Unauthorized**:
```json
{
  "error": "Authentication required or invalid"
}
```

**403 Forbidden**:
```json
{
  "error": "Access denied"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error message"
}
```

## Rate Limiting

Currently, there are no rate limits implemented. Consider implementing rate limiting for production use, especially for:
- OTP sending endpoints
- Login attempts
- Registration attempts

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt with 12 rounds
2. **OTP Expiration**: OTPs expire after 10 minutes (DynamoDB TTL)
3. **Session Management**: Sessions expire after 1 day (default) or 30 days (remember me)
4. **Input Validation**: All inputs are validated and normalized
5. **Phone Number Format**: Phone numbers are normalized to E.164 format
6. **Username Format**: Usernames are normalized to lowercase

