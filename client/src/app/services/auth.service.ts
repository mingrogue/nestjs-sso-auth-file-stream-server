import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, switchMap, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  picture?: string;
  roles: string[];
}

export interface AuthResponse {
  valid: boolean;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isRefreshing = false;

  constructor(private http: HttpClient) {
    // Defer to avoid circular dependency with AuthInterceptor
    setTimeout(() => this.loadUserFromToken(), 0);
  }

  get token(): string | null {
    return localStorage.getItem('access_token');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.ssoAuthUrl}/auth/google`;
  }

  loginWithGithub(): void {
    window.location.href = `${environment.ssoAuthUrl}/auth/github`;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.ssoAuthUrl}/auth/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  register(data: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.ssoAuthUrl}/auth/register`, data).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  handleCallback(token: string, refreshToken?: string): void {
    localStorage.setItem('access_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    this.loadUserFromToken();
  }

  logout(): void {
    const refreshToken = this.refreshToken;
    if (refreshToken) {
      this.http.post(`${environment.ssoAuthUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.currentUserSubject.next(null);
  }

  validateToken(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${environment.ssoAuthUrl}/auth/validate`).pipe(
      tap(response => {
        if (response.valid) {
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  refreshAccessToken(): Observable<RefreshResponse> {
    const refreshToken = this.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<RefreshResponse>(`${environment.ssoAuthUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  private loadUserFromToken(): void {
    const token = this.token;
    const refreshToken = this.refreshToken;
    console.log('[AuthService] loadUserFromToken called');
    console.log('[AuthService] access_token exists:', !!token);
    console.log('[AuthService] refresh_token exists:', !!refreshToken);
    
    if (token) {
      // The interceptor handles 401 and token refresh automatically
      // Just call validateToken and let the interceptor handle refresh if needed
      this.validateToken().subscribe({
        next: (response) => {
          console.log('[AuthService] validateToken success:', response);
          if (response.valid && response.user) {
            this.currentUserSubject.next(response.user);
          }
        },
        error: (err) => {
          console.error('[AuthService] validateToken failed:', err);
          // Don't logout here - the interceptor handles 401 and redirects if needed
        }
      });
    }
  }
}
