# Streaming Service

A production-grade NestJS microservice for secure file streaming with HTTP range request support, caching, rate limiting, and comprehensive security features.

## 🎯 Features

### File Streaming
- **HTTP Range Requests** - Support for video/audio seeking
- **Partial Content (206)** - Efficient bandwidth usage
- **Chunked Transfer** - Configurable chunk sizes
- **Multiple File Types** - Video, audio, images, documents, archives

### Caching & Performance
- **ETag Support** - Content-based cache validation
- **Last-Modified Headers** - Time-based cache validation
- **304 Not Modified** - Skip re-download of unchanged content
- **Cache-Control Headers** - Browser caching directives
- **Configurable Chunk Size** - Optimize for your use case

### Security
- **JWT Authentication** - All endpoints protected
- **Path Traversal Prevention** - Validates all filenames
- **File Type Whitelist** - Only allowed extensions served
- **Helmet Middleware** - Security headers
- **Rate Limiting** - Prevents abuse

### Monitoring & Logging
- **Structured Logging** - NestJS Logger integration
- **Request Timing** - Duration and bytes transferred
- **Health Endpoint** - Service status check
- **Error Tracking** - Stream error logging

## 📁 Project Structure

```
apps/streaming/src/
├── main.ts                    # Application entry point
├── streaming.module.ts        # Root module with dependencies
├── streaming.controller.ts    # HTTP endpoints
└── streaming.service.ts       # Core streaming logic
```

## 🔌 API Endpoints

### Health Check

#### `GET /stream/health`
Returns service health status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "streaming"
}
```

---

### File Listing

#### `GET /stream/files`
Lists all available files in the uploads directory.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "John Doe"
  },
  "files": [
    {
      "filename": "video.mp4",
      "size": 104857600,
      "sizeFormatted": "100 MB",
      "mimeType": "video/mp4",
      "isStreamable": true,
      "etag": "\"abc123...\"",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "modifiedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### File Information

#### `GET /stream/info/:filename`
Returns metadata for a specific file.

**Headers:**
```
Authorization: Bearer <token>
```

**Parameters:**
- `filename` - Name of the file (URL encoded)

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "John Doe"
  },
  "file": {
    "filename": "video.mp4",
    "size": 104857600,
    "sizeFormatted": "100 MB",
    "mimeType": "video/mp4",
    "isStreamable": true,
    "etag": "\"abc123...\"",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "modifiedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### File Streaming

#### `GET /stream/:filename`
Streams file content with optional range support.

**Headers:**
```
Authorization: Bearer <token>
Range: bytes=0-1048575          # Optional: Request specific byte range
If-None-Match: "<etag>"         # Optional: Cache validation
If-Modified-Since: <date>       # Optional: Cache validation
```

**Parameters:**
- `filename` - Name of the file (URL encoded)

**Response (Full File - 200 OK):**
```
Content-Type: video/mp4
Content-Length: 104857600
Accept-Ranges: bytes
ETag: "abc123..."
Last-Modified: Mon, 01 Jan 2024 00:00:00 GMT
Cache-Control: private, max-age=3600
Content-Disposition: inline; filename="video.mp4"
X-Content-Type-Options: nosniff

<binary file content>
```

**Response (Partial Content - 206):**
```
Content-Type: video/mp4
Content-Length: 1048576
Content-Range: bytes 0-1048575/104857600
Accept-Ranges: bytes
ETag: "abc123..."

<partial binary content>
```

**Response (Not Modified - 304):**
```
(empty body)
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `STREAMING_PORT` | Service port | No | `3002` |
| `FILES_DIRECTORY` | Path to files directory | No | `./uploads` |
| `MAX_CHUNK_SIZE` | Maximum bytes per chunk | No | `10485760` (10MB) |
| `THROTTLE_TTL` | Rate limit window (ms) | No | `60000` (1 min) |
| `THROTTLE_LIMIT` | Max requests per window | No | `100` |
| `ALLOWED_EXTENSIONS` | Comma-separated extensions | No | All supported |
| `JWT_SECRET` | JWT validation secret | **Yes** | - |
| `FRONTEND_URL` | CORS allowed origin | No | `http://localhost:4200` |
| `NODE_ENV` | Environment mode | No | `development` |

### Supported File Types

#### Video
| Extension | MIME Type |
|-----------|-----------|
| mp4 | video/mp4 |
| webm | video/webm |
| ogg, ogv | video/ogg |
| avi | video/x-msvideo |
| mov | video/quicktime |
| wmv | video/x-ms-wmv |
| flv | video/x-flv |
| mkv | video/x-matroska |
| m4v | video/x-m4v |
| 3gp | video/3gpp |

#### Audio
| Extension | MIME Type |
|-----------|-----------|
| mp3 | audio/mpeg |
| wav | audio/wav |
| flac | audio/flac |
| aac | audio/aac |
| m4a | audio/mp4 |
| wma | audio/x-ms-wma |
| opus | audio/opus |

#### Images
| Extension | MIME Type |
|-----------|-----------|
| jpg, jpeg | image/jpeg |
| png | image/png |
| gif | image/gif |
| webp | image/webp |
| svg | image/svg+xml |
| bmp | image/bmp |
| ico | image/x-icon |

#### Documents
| Extension | MIME Type |
|-----------|-----------|
| pdf | application/pdf |
| doc | application/msword |
| docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| xls | application/vnd.ms-excel |
| xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| ppt | application/vnd.ms-powerpoint |
| pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |

#### Text
| Extension | MIME Type |
|-----------|-----------|
| txt | text/plain |
| html | text/html |
| css | text/css |
| js | application/javascript |
| json | application/json |
| xml | application/xml |
| csv | text/csv |
| md | text/markdown |

#### Archives
| Extension | MIME Type |
|-----------|-----------|
| zip | application/zip |
| rar | application/vnd.rar |
| 7z | application/x-7z-compressed |
| tar | application/x-tar |
| gz | application/gzip |

## 🔐 Security Features

### Authentication
- All endpoints require valid JWT token
- Token validated using shared JWT strategy
- User info extracted from token payload

### Path Traversal Prevention
```typescript
// Blocked patterns:
"../secret.txt"     // Parent directory
"/etc/passwd"       // Absolute paths
"folder/file.txt"   // Subdirectories
"file%2F..%2F.."    // URL encoded traversal
```

### File Type Whitelist
- Only configured extensions are served
- Unknown extensions return 400 Bad Request
- Configurable via `ALLOWED_EXTENSIONS`

### Rate Limiting
- Configurable requests per time window
- Returns 429 Too Many Requests when exceeded
- Per-IP rate limiting

### Security Headers (Helmet)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Cross-origin resource policy configured

## 🏃 Running the Service

### Development
```bash
# From monorepo root
npm run start:streaming

# With watch mode
npm run start:dev streaming
```

### Production
```bash
# Build
npm run build streaming

# Run
npm run start:prod:streaming
```

## 📊 FileInfo Interface

```typescript
interface FileInfo {
  filename: string;      // File name
  size: number;          // Size in bytes
  sizeFormatted: string; // Human-readable size (e.g., "100 MB")
  mimeType: string;      // MIME type
  isStreamable: boolean; // True for video/audio
  etag: string;          // Cache validation tag
  createdAt: Date;       // File creation time
  modifiedAt: Date;      // Last modification time
}
```

## 🧪 Testing

### cURL Examples

#### List Files
```bash
curl http://localhost:3002/stream/files \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get File Info
```bash
curl http://localhost:3002/stream/info/video.mp4 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Stream Full File
```bash
curl http://localhost:3002/stream/video.mp4 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o video.mp4
```

#### Stream with Range (First 1MB)
```bash
curl http://localhost:3002/stream/video.mp4 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Range: bytes=0-1048575" \
  -o partial.mp4
```

#### Stream with Range (Last 500KB)
```bash
curl http://localhost:3002/stream/video.mp4 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Range: bytes=-512000" \
  -o partial.mp4
```

#### Cache Validation (ETag)
```bash
curl http://localhost:3002/stream/video.mp4 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H 'If-None-Match: "abc123..."' \
  -v
# Returns 304 if unchanged
```

#### Health Check
```bash
curl http://localhost:3002/stream/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 Performance Considerations

### Chunk Size
- Default: 10MB per chunk
- Smaller chunks = more requests, better seeking
- Larger chunks = fewer requests, more memory

### Caching
- ETag based on file path + size + mtime
- 1-hour browser cache (private)
- 304 responses save bandwidth

### Rate Limiting
- Default: 100 requests per minute
- Adjust based on expected load
- Consider CDN for high traffic

## 🐛 Troubleshooting

### "File not found"
- Verify file exists in `FILES_DIRECTORY`
- Check file permissions
- Ensure filename matches exactly (case-sensitive)

### "File type not allowed"
- Extension not in whitelist
- Add extension to `ALLOWED_EXTENSIONS`
- Or use default (all types)

### "Invalid range"
- Range start > file size
- Range end < range start
- Use proper format: `bytes=0-1023`

### "Rate limit exceeded"
- Wait for TTL window to reset
- Increase `THROTTLE_LIMIT`
- Implement client-side throttling

### Video not seeking
- Ensure `Accept-Ranges: bytes` header present
- Check CORS exposes `Content-Range` header
- Verify range requests working with cURL

## 📚 Dependencies

- `@nestjs/config` - Configuration management
- `@nestjs/throttler` - Rate limiting
- `helmet` - Security headers
- `@app/common` - Shared JWT strategy and guards
