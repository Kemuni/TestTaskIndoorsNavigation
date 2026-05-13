import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AuthUserResponse,
  LoginRequest,
  RegisterRequest,
  TokenRefreshRequest,
  TokenRefreshResponse,
  User,
} from '../models/user.model';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _currentUser = signal<User | null>(this.loadUser());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  private loadUser(): User | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem('current_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(REFRESH_KEY);
  }

  login(payload: LoginRequest): Observable<AuthUserResponse> {
    return this.http.post<AuthUserResponse>('/api/login/', payload).pipe(
      tap((res) => this.storeSession(res)),
    );
  }

  register(payload: RegisterRequest): Observable<AuthUserResponse> {
    return this.http.post<AuthUserResponse>('/api/register/', payload).pipe(
      tap((res) => this.storeSession(res)),
    );
  }

  refreshToken(): Observable<TokenRefreshResponse> {
    const refresh = this.getRefreshToken() ?? '';
    const payload: TokenRefreshRequest = { refresh };
    return this.http.post<TokenRefreshResponse>('/api/token/refresh/', payload).pipe(
      tap((res) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(ACCESS_KEY, res.data.access);
          localStorage.setItem(REFRESH_KEY, res.data.refresh);
        }
      }),
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem('current_user');
    }
    this._currentUser.set(null);
  }

  private storeSession(res: AuthUserResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(ACCESS_KEY, res.data.access);
      localStorage.setItem(REFRESH_KEY, res.data.refresh);
      localStorage.setItem('current_user', JSON.stringify(res.data.user));
    }
    this._currentUser.set(res.data.user);
  }

  updateCurrentUser(user: User): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('current_user', JSON.stringify(user));
    }
    this._currentUser.set(user);
  }
}
