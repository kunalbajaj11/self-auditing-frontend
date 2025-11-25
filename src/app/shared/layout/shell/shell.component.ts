import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { MatSidenav } from '@angular/material/sidenav';
import { Observable, Subject, of, combineLatest } from 'rxjs';
import { catchError, filter, map, shareReplay, startWith, take, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { LicenseService } from '../../../core/services/license.service';
import { AuthUser } from '../../../core/models/user.model';

type BadgeKey = 'pendingAccruals' | 'unreadNotifications';

interface ShellNavItemConfig {
  label: string;
  route?: string;
  icon?: string;
  badgeKey?: BadgeKey;
  children?: ShellNavItemConfig[];
  queryParams?: Record<string, any>;
}

interface ShellNavItem extends ShellNavItemConfig {
  badgeCount$?: Observable<number>;
  children?: ShellNavItem[];
}

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly user$: Observable<AuthUser | null>;
  readonly isHandset$: Observable<boolean>;

  pageTitle = 'selfAccounting.AI';
  navItems: ShellNavItem[] = [];
  isEnterprise = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly breakpointObserver: BreakpointObserver,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly expensesService: ExpensesService,
    private readonly notificationsService: NotificationsService,
    private readonly licenseService: LicenseService,
  ) {
    this.user$ = this.authService.currentUser$;
    this.isHandset$ = this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(
        map((result) => result.matches),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
  }

  ngOnInit(): void {
    // Load license info first
    this.licenseService.isEnterprise().pipe(
      takeUntil(this.destroy$),
      catchError(() => of(false)),
    ).subscribe((isEnterprise) => {
      this.isEnterprise = isEnterprise;
      this.updateShellFromRoute();
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.updateShellFromRoute());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authService.logout().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => this.router.navigateByUrl('/auth/login'),
    });
  }

  closeDrawerIfHandset(drawer: MatSidenav): void {
    this.isHandset$.pipe(take(1)).subscribe((isHandset) => {
      if (isHandset) {
        drawer.close();
      }
    });
  }

  private updateShellFromRoute(): void {
    const { title, nav } = this.collectShellData();
    if (title) {
      this.pageTitle = title;
    }
    this.navItems = this.transformNavItems(nav ?? []);
  }

  private collectShellData(): {
    title?: string;
    nav?: ShellNavItemConfig[];
  } {
    let currentRoute: ActivatedRoute | null = this.route;
    let shellData: { title?: string; nav?: ShellNavItemConfig[] } = {};

    while (currentRoute) {
      const currentShell = currentRoute.snapshot.data['shell'];
      if (currentShell) {
        shellData = { ...shellData, ...currentShell };
      }
      currentRoute = currentRoute.firstChild;
    }

    return shellData;
  }

  private transformNavItems(items: ShellNavItemConfig[]): ShellNavItem[] {
    return this.filterNavItemsByLicense(items).map((item) => this.enrichNavItem(item));
  }

  private filterNavItemsByLicense(items: ShellNavItemConfig[]): ShellNavItemConfig[] {
    return items.filter((item) => {
      // Filter out enterprise-only features for standard license
      const route = item.route || '';
      const isBankReconciliation = route.includes('bank-reconciliation');
      const isReminders = route.includes('reminders') || route.includes('notifications');
      const isUploadDocument = route.includes('/upload') && !route.includes('bank-reconciliation');
      
      // Check children too
      if (item.children) {
        const filteredChildren = this.filterNavItemsByLicense(item.children);
        if (filteredChildren.length === 0) {
          return false; // Hide parent if all children are filtered out
        }
        item.children = filteredChildren;
      }
      
      // Hide enterprise-only features for standard license
      if (!this.isEnterprise && (isBankReconciliation || isReminders || isUploadDocument)) {
        return false;
      }
      
      return true;
    });
  }

  private enrichNavItem(item: ShellNavItemConfig): ShellNavItem {
    const navItem: ShellNavItem = {
      ...item,
      children: item.children ? this.transformNavItems(item.children) : undefined,
    };
    if (item.badgeKey && this.canUseBadge(item.badgeKey)) {
      navItem.badgeCount$ = this.resolveBadgeObservable(item.badgeKey);
    }
    return navItem;
  }

  private canUseBadge(key: BadgeKey): boolean {
    const user = this.authService.getCurrentUserSnapshot();
    if (!user) {
      return false;
    }
    if (key === 'pendingAccruals' || key === 'unreadNotifications') {
      return Boolean(user.organization);
    }
    return true;
  }

  private resolveBadgeObservable(key: BadgeKey): Observable<number> {
    switch (key) {
      case 'pendingAccruals':
        return this.expensesService
          .pendingAccrualCount()
          .pipe(
            map((response) => response.pending ?? 0),
            catchError(() => of(0)),
          );
      case 'unreadNotifications':
        return this.notificationsService
          .listNotifications({ isRead: false })
          .pipe(
            map((notifications) => notifications.length),
            catchError(() => of(0)),
          );
      default:
        return of(0);
    }
  }
}

