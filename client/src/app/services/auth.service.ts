import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  get token(): string | null {
    return localStorage.getItem('access_token');
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

  handleCallback(token: string): void {
    localStorage.setItem('access_token', token);
    this.loadUserFromToken();
  }

  logout(): void {
    localStorage.removeItem('access_token');
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

  private loadUserFromToken(): void {
    if (this.token) {
      this.validateToken().subscribe({
        next: () => {},
        error: () => this.logout()
      });
    }
  }
}
