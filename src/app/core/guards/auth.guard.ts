import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> {
    // Wait for session initialization to complete first
    return this.authService.initialized$.pipe(
      filter((initialized) => initialized), // Wait until initialized is true
      take(1),
      switchMap(() => this.checkAuth(route, state)),
    );
  }

  private checkAuth(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> {
    return this.authService.currentUser$.pipe(
      take(1),
      switchMap((user) => {
        if (user) {
          return of(true);
        }

        const tokens = this.tokenService.getTokens();
        if (tokens) {
          // Try to fetch profile with existing token
          return this.authService.fetchProfile().pipe(
            map(() => true),
            catchError(() =>
              // If that fails, try to refresh the session
              this.authService.refreshSession().pipe(
                switchMap(() => this.authService.fetchProfile()),
                map(() => true),
                catchError(() =>
                  of(
                    this.router.createUrlTree(['auth', 'login'], {
                      queryParams: { returnUrl: state.url },
                    }),
                  ),
                ),
              ),
            ),
          );
        }

        return of(
          this.router.createUrlTree(['auth', 'login'], {
            queryParams: { returnUrl: state.url },
          }),
        );
      }),
    );
  }
}
