import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, switchMap, map } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService, AuthTokens } from './token.service';
import { AuthUser, UserRole } from '../models/user.model';

interface LoginResponse {
  tokens: AuthTokens;
  user: AuthUser;
}

export interface LicensePreview {
  key: string;
  planType?: string | null;
  maxUsers?: number | null;
  storageQuotaMb?: number | null;
  expiresAt: string;
  status: string;
  region?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(
    null,
  );
  readonly currentUser$ = this.currentUserSubject.asObservable();
  private readonly initializedSubject = new BehaviorSubject<boolean>(false);
  readonly initialized$ = this.initializedSubject.asObservable();

  constructor(
    private readonly api: ApiService,
    private readonly tokenService: TokenService,
  ) {
    this.initializeSession();
  }

  private initializeSession(): void {
    const tokens = this.tokenService.getTokens();
    if (!tokens) {
      this.initializedSubject.next(true);
      return;
    }

    // Try to fetch profile with existing token first
    this.fetchProfile()
      .pipe(
        tap(() => {
          this.initializedSubject.next(true);
        }),
        catchError(() => {
          // If profile fetch fails, try to refresh the session
          return this.refreshSession().pipe(
            tap(() => {
              this.initializedSubject.next(true);
            }),
            catchError(() => {
              // If refresh also fails, clear tokens and mark as initialized
              this.tokenService.clearTokens();
              this.currentUserSubject.next(null);
              this.initializedSubject.next(true);
              return of(null);
            }),
          );
        }),
      )
      .subscribe();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/login', { email, password })
      .pipe(tap((response) => this.hydrateSession(response)));
  }

  validateLicense(licenseKey: string): Observable<LicensePreview> {
    return this.api.post<LicensePreview>('/auth/license/validate', {
      licenseKey,
    });
  }

  registerWithLicense(payload: any): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('/auth/register', payload)
      .pipe(tap((response) => this.hydrateSession(response)));
  }

  refreshSession(): Observable<AuthTokens> {
    const tokens = this.tokenService.getTokens();
    if (!tokens) {
      throw new Error('No refresh token found');
    }
    return this.api
      .post<AuthTokens>('/auth/refresh', {
        refreshToken: tokens.refreshToken,
      })
      .pipe(
        tap((newTokens) => {
          this.tokenService.setTokens(newTokens);
        }),
        switchMap(() => this.fetchProfile()),
        map(() => this.tokenService.getTokens()!),
      );
  }

  fetchProfile(): Observable<AuthUser> {
    return this.api.get<AuthUser>('/users/me').pipe(
      tap((user) => this.currentUserSubject.next(user)),
    );
  }

  logout(): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }>('/auth/logout').pipe(
      tap(() => {
        this.tokenService.clearTokens();
        this.currentUserSubject.next(null);
      }),
    );
  }

  getCurrentUserSnapshot(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  hasRole(roles: UserRole | UserRole[]): boolean {
    const current = this.currentUserSubject.value;
    if (!current) {
      return false;
    }
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(current.role);
  }

  forgotPassword(email: string): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }>('/auth/forgot-password', {
      email,
    });
  }

  resetPassword(token: string, password: string): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }>('/auth/reset-password', {
      token,
      password,
    });
  }

  private hydrateSession(response: LoginResponse) {
    this.tokenService.setTokens(response.tokens);
    this.currentUserSubject.next(response.user);
  }
}
