# NestJS SSO Streaming Application

A production-ready monorepo containing microservices for SSO authentication and media streaming, with an Angular client application.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Angular Client                            │
│                      (http://localhost:4200)                     │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
                      ▼                       ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│    SSO Auth Service         │   │    Streaming Service        │
│    (http://localhost:3001)  │   │    (http://localhost:3002)  │
│                             │   │                             │
│  • Google OAuth             │   │  • File Streaming           │
│  • GitHub OAuth             │   │  • Range Requests           │
│  • JWT Token Generation     │   │  • Caching (ETag)           │
│  • User Management          │   │  • Rate Limiting            │
└─────────────────────────────┘   └─────────────────────────────┘
                      │                       │
                      └───────────┬───────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │    Shared Common Lib    │
                    │  • JWT Strategy         │
                    │  • Auth Guard           │
                    │  • User Decorator       │
                    └─────────────────────────┘
```

## 📁 Project Structure

```
nestjs-sso-streaming/
├── apps/
│   ├── sso-auth/              # SSO Authentication Service
│   │   └── src/
│   │       ├── auth/          # Auth module, controller, service
│   │       ├── users/         # User management
│   │       ├── entities/      # User entity
│   │       ├── strategies/    # OAuth strategies (Google, GitHub)
│   │       └── dto/           # Data transfer objects
│   └── streaming/             # File Streaming Service
│       └── src/
│           ├── streaming.module.ts
│           ├── streaming.controller.ts
│           └── streaming.service.ts
├── libs/
│   └── common/                # Shared library
│       └── src/
│           ├── guards/        # JWT Auth Guard
│           ├── strategies/    # JWT Strategy
│           ├── decorators/    # CurrentUser decorator
│           └── interfaces/    # User, JWT payload interfaces
├── client/                    # Angular Client Application
│   └── src/
│       └── app/
│           ├── components/    # UI Components
│           ├── services/      # Auth & Streaming services
│           ├── guards/        # Route guards
│           └── interceptors/  # HTTP interceptors
└── uploads/                   # Streamable files directory
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Angular CLI** 16.x (for client development)

### 1. Clone and Install

```bash
cd nestjs-sso-streaming
npm install

# Install Angular client dependencies
cd client
npm install
cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your OAuth credentials (see [Configuration](#configuration) section).

### 3. Start Services

```bash
# Terminal 1: Start backend services
npm run start:all

# Terminal 2: Start Angular client
cd client
npm start
```

### 4. Access Application

- **Client**: http://localhost:4200
- **SSO Auth API**: http://localhost:3001
- **Streaming API**: http://localhost:3002

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| **SSO Auth Service** |
| `SSO_AUTH_PORT` | Port for auth service | `3001` |
| `JWT_SECRET` | Secret key for JWT signing | Required |
| `JWT_EXPIRATION` | Token expiration in seconds | `3600` |
| **OAuth Providers** |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Required |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Required |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | `http://localhost:3001/auth/google/callback` |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Required |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | Required |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL | `http://localhost:3001/auth/github/callback` |
| **Streaming Service** |
| `STREAMING_PORT` | Port for streaming service | `3002` |
| `FILES_DIRECTORY` | Directory for media files | `./uploads` |
| `MAX_CHUNK_SIZE` | Max bytes per chunk | `10485760` (10MB) |
| `THROTTLE_TTL` | Rate limit window (ms) | `60000` |
| `THROTTLE_LIMIT` | Max requests per window | `100` |
| **General** |
| `FRONTEND_URL` | Frontend URL for redirects | `http://localhost:4200` |
| `NODE_ENV` | Environment mode | `development` |

### OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set Application type to **Web application**
6. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set Homepage URL: `http://localhost:4200`
4. Set Authorization callback URL: `http://localhost:3001/auth/github/callback`
5. Copy Client ID and Client Secret to `.env`

## 📚 API Documentation

### SSO Auth Service (Port 3001)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auth/google` | No | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | No | Handle Google OAuth callback |
| `GET` | `/auth/github` | No | Initiate GitHub OAuth flow |
| `GET` | `/auth/github/callback` | No | Handle GitHub OAuth callback |
| `GET` | `/auth/validate` | JWT | Validate current token |
| `GET` | `/auth/profile` | JWT | Get user profile |

### Streaming Service (Port 3002)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/stream/health` | JWT | Health check endpoint |
| `GET` | `/stream/files` | JWT | List all available files |
| `GET` | `/stream/info/:filename` | JWT | Get file metadata |
| `GET` | `/stream/:filename` | JWT | Stream file content |

#### Streaming Headers

**Request Headers:**
- `Authorization: Bearer <token>` - Required JWT token
- `Range: bytes=0-1023` - Optional range for partial content
- `If-None-Match: "<etag>"` - For cache validation
- `If-Modified-Since: <date>` - For cache validation

**Response Headers:**
- `Content-Type` - MIME type of the file
- `Content-Length` - Size in bytes
- `Accept-Ranges: bytes` - Indicates range support
- `Content-Range: bytes 0-1023/10240` - For partial responses
- `ETag` - Cache validation tag
- `Last-Modified` - File modification date
- `Cache-Control: private, max-age=3600`

## 🔐 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ SSO Auth │     │  OAuth   │     │ Streaming│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Click Login │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │ 2. Redirect to OAuth            │                │
     │<───────────────│                │                │
     │                │                │                │
     │ 3. Authenticate with Provider   │                │
     │────────────────────────────────>│                │
     │                │                │                │
     │ 4. Callback with code           │                │
     │<────────────────────────────────│                │
     │                │                │                │
     │ 5. Exchange code for token      │                │
     │───────────────>│                │                │
     │                │ 6. Get user info               │
     │                │───────────────>│                │
     │                │<───────────────│                │
     │                │                │                │
     │ 7. Create/Update user           │                │
     │                │                │                │
     │ 8. Generate JWT                 │                │
     │                │                │                │
     │ 9. Redirect with token          │                │
     │<───────────────│                │                │
     │                │                │                │
     │ 10. Store token                 │                │
     │                │                │                │
     │ 11. Request files with JWT      │                │
     │─────────────────────────────────────────────────>│
     │                │                │                │
     │ 12. Validate JWT                │                │
     │                │                │                │
     │ 13. Return files                │                │
     │<─────────────────────────────────────────────────│
```

## 🎬 Streaming Features

### Supported File Types

| Category | Extensions | MIME Types |
|----------|------------|------------|
| **Video** | mp4, webm, ogg, avi, mov, mkv, m4v, 3gp | video/* |
| **Audio** | mp3, wav, flac, aac, m4a, opus | audio/* |
| **Images** | jpg, png, gif, webp, svg, bmp | image/* |
| **Documents** | pdf, doc, docx, xls, xlsx, ppt, pptx | application/* |
| **Text** | txt, html, css, js, json, xml, csv, md | text/* |
| **Archives** | zip, rar, 7z, tar, gz | application/* |

### Range Requests (Seeking)

The streaming service supports HTTP Range requests for video/audio seeking:

```bash
# Request first 1MB
curl -H "Range: bytes=0-1048575" http://localhost:3002/stream/video.mp4

# Request last 500KB
curl -H "Range: bytes=-512000" http://localhost:3002/stream/video.mp4
```

### Caching

- **ETag-based**: Files include ETag header for cache validation
- **Last-Modified**: Supports If-Modified-Since conditional requests
- **304 Not Modified**: Returns empty body when content unchanged

## 🛡️ Security Features

1. **JWT Authentication** - All protected endpoints require valid JWT
2. **OAuth 2.0** - Secure third-party authentication
3. **Helmet** - Security headers (XSS, content-type sniffing protection)
4. **Rate Limiting** - Prevents abuse (configurable limits)
5. **Path Traversal Prevention** - Validates all filenames
6. **CORS** - Configured allowed origins
7. **File Type Whitelist** - Only allowed extensions served

## 🧪 Development

### Available Scripts

```bash
# Development
npm run start:sso-auth       # Start auth service in watch mode
npm run start:streaming      # Start streaming service in watch mode
npm run start:all            # Start both services

# Build
npm run build sso-auth       # Build auth service
npm run build streaming      # Build streaming service
npm run build:all            # Build all services

# Production
npm run start:prod:sso-auth  # Start auth in production
npm run start:prod:streaming # Start streaming in production
```

### Adding Test Files

Place media files in the `uploads/` directory:

```bash
cp ~/Videos/sample.mp4 ./uploads/
cp ~/Music/sample.mp3 ./uploads/
```

## 📖 Individual Service Documentation

- [SSO Auth Service Documentation](./apps/sso-auth/README.md)
- [Streaming Service Documentation](./apps/streaming/README.md)
- [Angular Client Documentation](./client/README.md)

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -i :3001  # Find process using port
kill -9 <PID>  # Kill the process
```

**OAuth redirect mismatch:**
- Ensure callback URLs in `.env` match exactly what's configured in OAuth provider
- Check for trailing slashes

**CORS errors:**
- Verify `FRONTEND_URL` in `.env` matches your client URL
- Check browser console for specific CORS error details

**Token validation fails:**
- Ensure `JWT_SECRET` is identical across all services
- Check token hasn't expired

## 📄 License

MIT License
