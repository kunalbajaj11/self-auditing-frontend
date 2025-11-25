import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';
import { filter, switchMap, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> {
    // Wait for session initialization to complete first
    return this.authService.initialized$.pipe(
      filter((initialized) => initialized), // Wait until initialized is true
      take(1),
      switchMap(() => {
        const allowedRoles = route.data['roles'] as UserRole[] | undefined;
        if (!allowedRoles) {
          return this.authService.currentUser$.pipe(
            take(1),
            map((user) => user !== null || this.router.createUrlTree(['auth', 'login'])),
          );
        }
        return this.authService.currentUser$.pipe(
          take(1),
          map((user) => {
            if (!user) {
              return this.router.createUrlTree(['auth', 'login']);
            }
            return allowedRoles.includes(user.role)
              ? true
              : this.router.createUrlTree(['auth', 'unauthorized']);
          }),
        );
      }),
    );
  }
}
