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

