import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly storageKey = environment.storageKey;

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.storageKey, JSON.stringify(tokens));
  }

  getTokens(): AuthTokens | null {
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
    localStorage.removeItem(this.storageKey);
  }
}
