# Angular Client Application

An Angular 16 client application for SSO authentication and media streaming, featuring OAuth login, file browsing, and video/audio playback with seeking support.

## 🎯 Features

### Authentication
- **Google OAuth** - One-click Google sign-in
- **GitHub OAuth** - One-click GitHub sign-in
- **JWT Token Management** - Automatic storage and refresh
- **Auth State** - Reactive authentication state with RxJS
- **Route Guards** - Protected routes requiring authentication
- **HTTP Interceptor** - Automatic token injection

### File Management
- **File Listing** - Browse available media files
- **File Information** - View size, type, and metadata
- **Visual Icons** - File type indicators
- **Sorting** - Files sorted by modification date

### Media Playback
- **Video Player** - HTML5 video with native controls
- **Audio Player** - HTML5 audio playback
- **Seeking Support** - Jump to any position in media
- **Token Authentication** - Secure streaming with JWT

### User Experience
- **Modern UI** - Clean, gradient-based design
- **Responsive Layout** - Works on desktop and mobile
- **Loading States** - Visual feedback during operations
- **Error Handling** - User-friendly error messages

## 📁 Project Structure

```
client/src/
├── app/
│   ├── components/
│   │   ├── login/              # OAuth login page
│   │   │   ├── login.component.ts
│   │   │   └── login.component.html
│   │   ├── auth-callback/      # OAuth redirect handler
│   │   │   ├── auth-callback.component.ts
│   │   │   └── auth-callback.component.html
│   │   ├── files/              # File listing page
│   │   │   ├── files.component.ts
│   │   │   └── files.component.html
│   │   └── video-player/       # Media player page
│   │       ├── video-player.component.ts
│   │       └── video-player.component.html
│   ├── services/
│   │   ├── auth.service.ts     # Authentication logic
│   │   └── streaming.service.ts # File/streaming API
│   ├── guards/
│   │   └── auth.guard.ts       # Route protection
│   ├── interceptors/
│   │   └── auth.interceptor.ts # JWT injection
│   ├── app.module.ts           # Root module
│   ├── app-routing.module.ts   # Route definitions
│   └── app.component.ts        # Root component
├── environments/
│   ├── environment.ts          # Development config
│   └── environment.prod.ts     # Production config
└── styles.scss                 # Global styles
```

## 🔌 Routes

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/` | - | No | Redirects to `/files` |
| `/login` | LoginComponent | No | OAuth login page |
| `/auth/callback` | AuthCallbackComponent | No | OAuth redirect handler |
| `/files` | FilesComponent | **Yes** | File listing |
| `/player/:filename` | VideoPlayerComponent | **Yes** | Media player |

## 🧩 Components

### LoginComponent
OAuth login page with provider buttons.

**Features:**
- Google sign-in button
- GitHub sign-in button
- Automatic redirect if already authenticated
- Clean, centered card layout

**Usage:**
```html
<app-login></app-login>
```

---

### AuthCallbackComponent
Handles OAuth redirect and token extraction.

**Features:**
- Extracts token from URL query params
- Stores token in localStorage
- Redirects to files page on success
- Shows error message on failure

**Flow:**
1. OAuth provider redirects to `/auth/callback?token=<JWT>`
2. Component extracts token from URL
3. Stores token via AuthService
4. Redirects to `/files`

---

### FilesComponent
Displays available files with user info.

**Features:**
- User avatar and name display
- Logout button
- File grid layout
- File type icons
- File size display
- Click to play media

**API Call:**
```typescript
this.streamingService.getFiles().subscribe(response => {
  this.files = response.files;
  this.user = response.user;
});
```

---

### VideoPlayerComponent
Media player for video and audio files.

**Features:**
- HTML5 video/audio element
- Native playback controls
- Seeking support (range requests)
- Back navigation button
- Download fallback for non-streamable files

**Token Handling:**
```typescript
// Constructs authenticated stream URL
this.streamUrl = `${environment.streamingUrl}/stream/${filename}?token=${token}`;
```

## 🔧 Services

### AuthService
Manages authentication state and OAuth flow.

**Methods:**

| Method | Description |
|--------|-------------|
| `loginWithGoogle()` | Redirects to Google OAuth |
| `loginWithGithub()` | Redirects to GitHub OAuth |
| `handleCallback(token)` | Stores token after OAuth |
| `logout()` | Clears token and redirects |
| `getToken()` | Returns current JWT token |
| `isAuthenticated()` | Returns auth state observable |
| `validateToken()` | Validates token with backend |

**State Management:**
```typescript
// Observable authentication state
isAuthenticated$: BehaviorSubject<boolean>

// Subscribe to auth changes
this.authService.isAuthenticated$.subscribe(isAuth => {
  console.log('Auth state:', isAuth);
});
```

---

### StreamingService
Handles file listing and streaming API calls.

**Methods:**

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getFiles()` | `Observable<FilesResponse>` | Lists all files |
| `getFileInfo(filename)` | `Observable<FileInfo>` | Gets file metadata |

**Interfaces:**
```typescript
interface FileInfo {
  filename: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  isStreamable: boolean;
  etag: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface FilesResponse {
  user: { id: string; username: string };
  files: FileInfo[];
}
```

## 🛡️ Guards

### AuthGuard
Protects routes requiring authentication.

**Implementation:**
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken()) {
    return true;
  }
  
  return router.createUrlTree(['/login']);
};
```

**Usage in Routes:**
```typescript
{ path: 'files', component: FilesComponent, canActivate: [authGuard] }
```

## 🔄 Interceptors

### AuthInterceptor
Automatically adds JWT token to HTTP requests.

**Implementation:**
```typescript
intercept(request: HttpRequest<any>, next: HttpHandler) {
  const token = this.authService.getToken();
  
  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next.handle(request);
}
```

**Excluded URLs:**
- OAuth endpoints (no token needed)
- External URLs

## ⚙️ Configuration

### Environment Variables

**Development** (`environment.ts`):
```typescript
export const environment = {
  production: false,
  authUrl: 'http://localhost:3001',
  streamingUrl: 'http://localhost:3002'
};
```

**Production** (`environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  authUrl: 'https://api.yoursite.com/auth',
  streamingUrl: 'https://api.yoursite.com/streaming'
};
```

## 🏃 Running the Application

### Prerequisites
- Node.js 18+
- npm 9+
- Angular CLI 16+

### Install Dependencies
```bash
cd client
npm install
```

### Development Server
```bash
npm start
# or
ng serve
```
Navigate to `http://localhost:4200`

### Production Build
```bash
npm run build
# or
ng build --configuration production
```
Build artifacts stored in `dist/client/`

### Running Tests
```bash
# Unit tests
npm test

# E2E tests (requires setup)
npm run e2e
```

## 🎨 Styling

### Global Styles
Located in `src/styles.scss`:

- **Reset** - Normalize box-sizing, margins
- **Typography** - System font stack
- **Colors** - Purple/blue gradient theme
- **Components** - Login, files, player styles

### CSS Classes

| Class | Description |
|-------|-------------|
| `.login-container` | Centers login card |
| `.login-card` | White card with shadow |
| `.oauth-buttons` | OAuth button container |
| `.google-btn` | Google button style |
| `.github-btn` | GitHub button style |
| `.files-container` | Files page wrapper |
| `.header` | Top navigation bar |
| `.files-grid` | Responsive file grid |
| `.file-card` | Individual file card |
| `.player-container` | Player page wrapper |
| `.player-wrapper` | Centers media element |

## 🔐 Authentication Flow

```
1. User visits /files (protected)
        │
        ▼
2. AuthGuard checks token
        │
        ▼ (no token)
3. Redirect to /login
        │
        ▼
4. User clicks OAuth button
        │
        ▼
5. Redirect to SSO Auth Service
        │
        ▼
6. OAuth with provider
        │
        ▼
7. Redirect to /auth/callback?token=JWT
        │
        ▼
8. AuthCallbackComponent stores token
        │
        ▼
9. Redirect to /files
        │
        ▼
10. AuthGuard allows access
        │
        ▼
11. Files displayed with user info
```

## 🎬 Media Playback Flow

```
1. User clicks file in /files
        │
        ▼
2. Navigate to /player/:filename
        │
        ▼
3. VideoPlayerComponent loads
        │
        ▼
4. Construct stream URL with token
        │
        ▼
5. Set video/audio src attribute
        │
        ▼
6. Browser requests file with Range header
        │
        ▼
7. Server returns 206 Partial Content
        │
        ▼
8. User can seek (new range requests)
```

## 🐛 Troubleshooting

### "Not authenticated" after login
- Check token is stored in localStorage
- Verify AuthInterceptor is registered
- Check browser console for errors

### Video not playing
- Verify file exists in uploads
- Check CORS headers allow streaming
- Try different browser

### Video not seeking
- Ensure Accept-Ranges header present
- Check Content-Range header exposed in CORS
- Verify range requests work in Network tab

### OAuth redirect fails
- Verify FRONTEND_URL in backend .env
- Check callback URL matches exactly
- Look for errors in backend logs

### CORS errors
- Backend FRONTEND_URL must match client origin
- Check exposed headers configuration
- Verify credentials setting matches

## 📚 Dependencies

### Production
- `@angular/core` - Angular framework
- `@angular/router` - Client-side routing
- `@angular/common/http` - HTTP client
- `rxjs` - Reactive extensions

### Development
- `@angular/cli` - CLI tooling
- `typescript` - Type checking
- `karma` - Test runner
- `jasmine` - Test framework

## 📝 Code Examples

### Check Authentication
```typescript
import { AuthService } from './services/auth.service';

constructor(private authService: AuthService) {
  this.authService.isAuthenticated$.subscribe(isAuth => {
    if (isAuth) {
      console.log('User is logged in');
    }
  });
}
```

### Fetch Files
```typescript
import { StreamingService } from './services/streaming.service';

constructor(private streamingService: StreamingService) {
  this.streamingService.getFiles().subscribe({
    next: (response) => {
      this.files = response.files;
    },
    error: (err) => {
      console.error('Failed to load files:', err);
    }
  });
}
```

### Navigate to Player
```typescript
import { Router } from '@angular/router';

constructor(private router: Router) {}

playFile(filename: string) {
  this.router.navigate(['/player', filename]);
}
```
