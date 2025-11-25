import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private authService?: AuthService;

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
        const isRefreshCall = req.url.includes('/auth/refresh');
        if (error.status === 401 && !this.isRefreshing && !isRefreshCall) {
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
              this.getAuthService().logout().subscribe();
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
}
