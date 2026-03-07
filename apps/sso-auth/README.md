# SSO Authentication Service

A NestJS microservice providing OAuth 2.0 authentication with Google and GitHub providers, JWT token generation, and user management.

## 🎯 Features

### OAuth 2.0 Authentication
- **Google OAuth** - Sign in with Google accounts
- **GitHub OAuth** - Sign in with GitHub accounts
- **Automatic user provisioning** - Creates users on first login
- **Profile synchronization** - Updates user info on subsequent logins

### JWT Token Management
- **Secure token generation** - RS256/HS256 signed tokens
- **Configurable expiration** - Set via environment variable
- **Token validation endpoint** - Verify token validity
- **Payload includes**: User ID, email, username, provider

### User Management
- **Find or create users** - Based on OAuth profile
- **Provider linking** - Track authentication provider
- **Profile storage** - Email, name, avatar URL

## 📁 Project Structure

```
apps/sso-auth/src/
├── main.ts                    # Application entry point
├── sso-auth.module.ts         # Root module
├── auth/
│   ├── auth.module.ts         # Auth module configuration
│   ├── auth.controller.ts     # OAuth endpoints
│   └── auth.service.ts        # Authentication logic
├── users/
│   └── users.service.ts       # User CRUD operations
├── entities/
│   └── user.entity.ts         # User data model
├── strategies/
│   ├── google.strategy.ts     # Google OAuth strategy
│   ├── github.strategy.ts     # GitHub OAuth strategy
│   └── index.ts               # Strategy exports
└── dto/
    ├── login.dto.ts           # Login data transfer object
    ├── register.dto.ts        # Register data transfer object
    └── index.ts               # DTO exports
```

## 🔌 API Endpoints

### OAuth Initiation

#### `GET /auth/google`
Redirects user to Google OAuth consent screen.

**Response:** `302 Redirect` to Google

---

#### `GET /auth/github`
Redirects user to GitHub OAuth authorization page.

**Response:** `302 Redirect` to GitHub

---

### OAuth Callbacks

#### `GET /auth/google/callback`
Handles Google OAuth callback after user authorization.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - CSRF protection state (optional)

**Response:** `302 Redirect` to `FRONTEND_URL/auth/callback?token=<JWT>`

---

#### `GET /auth/github/callback`
Handles GitHub OAuth callback after user authorization.

**Query Parameters:**
- `code` - Authorization code from GitHub

**Response:** `302 Redirect` to `FRONTEND_URL/auth/callback?token=<JWT>`

---

### Token Management

#### `GET /auth/validate`
Validates the current JWT token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

---

#### `GET /auth/profile`
Returns the current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "John Doe",
  "provider": "google",
  "providerId": "123456789",
  "avatarUrl": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SSO_AUTH_PORT` | Service port | No | `3001` |
| `JWT_SECRET` | Secret for signing JWTs | **Yes** | - |
| `JWT_EXPIRATION` | Token expiration (seconds) | No | `3600` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | **Yes** | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | **Yes** | - |
| `GOOGLE_CALLBACK_URL` | Google callback URL | No | `http://localhost:3001/auth/google/callback` |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | **Yes** | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | **Yes** | - |
| `GITHUB_CALLBACK_URL` | GitHub callback URL | No | `http://localhost:3001/auth/github/callback` |
| `FRONTEND_URL` | Frontend redirect URL | No | `http://localhost:4200` |

### OAuth Provider Setup

#### Google Cloud Console
1. Create project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
5. Add authorized JavaScript origin: `http://localhost:4200`

#### GitHub Developer Settings
1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Homepage URL: `http://localhost:4200`
4. Set Callback URL: `http://localhost:3001/auth/github/callback`

## 🔐 Security Features

### Token Security
- **HS256 signing** - HMAC with SHA-256
- **Configurable secret** - Use strong, unique secret in production
- **Expiration** - Tokens expire after configured duration
- **No refresh tokens** - Requires re-authentication after expiry

### OAuth Security
- **State parameter** - CSRF protection (Google)
- **HTTPS callbacks** - Required in production
- **Scope limitation** - Only requests necessary permissions

### CORS Configuration
- Configured allowed origins
- Credentials support enabled
- Preflight caching

## 🏃 Running the Service

### Development
```bash
# From monorepo root
npm run start:sso-auth

# With watch mode
npm run start:dev sso-auth
```

### Production
```bash
# Build
npm run build sso-auth

# Run
npm run start:prod:sso-auth
```

## 📊 User Entity Schema

```typescript
interface User {
  id: string;           // UUID v4
  email: string;        // User's email
  username: string;     // Display name
  provider: string;     // 'google' | 'github'
  providerId: string;   // Provider's user ID
  avatarUrl?: string;   // Profile picture URL
  createdAt: Date;      // First login timestamp
  updatedAt: Date;      // Last login timestamp
}
```

## 🔄 Authentication Flow

```
1. User clicks "Login with Google/GitHub"
           │
           ▼
2. Redirect to OAuth provider
           │
           ▼
3. User authenticates with provider
           │
           ▼
4. Provider redirects to callback URL with code
           │
           ▼
5. Service exchanges code for access token
           │
           ▼
6. Service fetches user profile from provider
           │
           ▼
7. Service creates/updates user in database
           │
           ▼
8. Service generates JWT token
           │
           ▼
9. Redirect to frontend with token in URL
           │
           ▼
10. Frontend stores token in localStorage
```

## 🧪 Testing

### Manual Testing with cURL

```bash
# Validate token
curl http://localhost:3001/auth/validate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get profile
curl http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Testing OAuth Flow
1. Open browser to `http://localhost:3001/auth/google`
2. Complete Google sign-in
3. Observe redirect to frontend with token
4. Use token for authenticated requests

## 📝 JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "user@example.com",
    "username": "John Doe",
    "iat": 1234567890,
    "exp": 1234571490
  }
}
```

## 🐛 Troubleshooting

### "Invalid redirect_uri"
- Ensure callback URL in `.env` exactly matches OAuth provider configuration
- Check for trailing slashes
- Verify protocol (http vs https)

### "Token expired"
- JWT_EXPIRATION may be too short
- Client clock may be out of sync
- Re-authenticate to get new token

### "User not found after OAuth"
- Check OAuth profile has email
- Verify provider returns required scopes
- Check server logs for errors

## 📚 Dependencies

- `@nestjs/passport` - Passport integration
- `@nestjs/jwt` - JWT utilities
- `passport-google-oauth20` - Google OAuth strategy
- `passport-github2` - GitHub OAuth strategy
- `@nestjs/config` - Configuration management
