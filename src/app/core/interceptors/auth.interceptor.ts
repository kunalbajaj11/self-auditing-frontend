import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private authService?: AuthService;
  private router?: Router;

  constructor(
    private readonly tokenService: TokenService,
    private readonly injector: Injector,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const tokens = this.tokenService.getTokens();
    const authReq = tokens
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        })
      : req;

    return next.handle(authReq).pipe(
      catchError((error) => {
        // /auth/refresh and /auth/logout must never themselves trigger another
        // refresh attempt, or a dead refresh token can loop indefinitely:
        // refresh fails -> logout() -> logout request 401s (dead token still
        // attached) -> treated as a fresh 401 -> refresh attempted again -> ...
        const isAuthExemptCall =
          req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');

        // Only ever attempt a refresh for a request that actually carried a
        // token. Without this, a plain wrong-password 401 on /auth/login (no
        // tokens stored yet) would also trigger refreshSession(), which used
        // to throw synchronously and permanently wedge isRefreshing = true
        // for the rest of the browser session.
        if (error.status === 401 && !this.isRefreshing && !isAuthExemptCall && tokens) {
          this.isRefreshing = true;
          return this.getAuthService().refreshSession().pipe(
            switchMap(() => {
              this.isRefreshing = false;
              const refreshedTokens = this.tokenService.getTokens();
              const retryRequest = refreshedTokens
                ? req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${refreshedTokens.accessToken}`,
                    },
                  })
                : req;
              return next.handle(retryRequest);
            }),
            catchError((refreshError) => {
              this.isRefreshing = false;
              // Clear the session locally rather than routing through
              // logout()'s network call: that call would carry the now-dead
              // access token, itself 401, and (absent the exemption above)
              // could re-enter this exact branch.
              this.getAuthService().clearSessionLocally();
              this.getRouter().navigateByUrl('/auth/login');
              return throwError(() => refreshError);
            }),
          );
        }
        return throwError(() => error);
      }),
    );
  }

  private getAuthService(): AuthService {
    if (!this.authService) {
      this.authService = this.injector.get(AuthService);
    }
    return this.authService;
  }

  private getRouter(): Router {
    if (!this.router) {
      this.router = this.injector.get(Router);
    }
    return this.router;
  }
}
