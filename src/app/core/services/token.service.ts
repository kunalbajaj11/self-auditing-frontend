import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly storageKey = environment.storageKey;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    // localStorage doesn't exist during SSR/prerendering (build-time Node
    // rendering of the public marketing routes) — guard every access so
    // those routes can render without a real browser environment.
    this.isBrowser = isPlatformBrowser(platformId);
  }

  setTokens(tokens: AuthTokens): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.storageKey, JSON.stringify(tokens));
  }

  getTokens(): AuthTokens | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthTokens;
    } catch (error) {
      this.clearTokens();
      return null;
    }
  }

  clearTokens(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.storageKey);
  }
}
