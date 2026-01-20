import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { MatSidenav } from '@angular/material/sidenav';
import { Observable, Subject, of, combineLatest } from 'rxjs';
import { catchError, filter, map, shareReplay, startWith, take, takeUntil, delay } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { LicenseService } from '../../../core/services/license.service';
import { AuthUser } from '../../../core/models/user.model';
import { PlanType } from '../../../core/models/plan.model';

type BadgeKey = 'pendingAccruals' | 'unreadNotifications';

interface ShellNavItemConfig {
  label: string;
  route?: string;
  icon?: string;
  badgeKey?: BadgeKey;
  children?: ShellNavItemConfig[];
  queryParams?: Record<string, any>;
  disabled?: boolean;
  disabledReason?: string;
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
export class ShellComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly user$: Observable<AuthUser | null>;
  readonly isHandset$: Observable<boolean>;

  pageTitle = 'SelfAccounting.AI';
  navItems: ShellNavItem[] = [];
  isEnterprise = false;
  isPremium = false;
  isStandard = false;
  planType: PlanType | null = null;
  isPayrollEnabled = false;
  isInventoryEnabled = false;
  expandedGroups = new Set<string>(); // Track expanded nav groups

  @ViewChild('sideNavList', { static: false }) sideNavList?: ElementRef<HTMLElement>;

  private sidebarScrollPosition = 0;
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
    this.loadLicenseInfo();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // Refresh license info on navigation to pick up any changes
        this.loadLicenseInfo();
        this.updateShellFromRoute();
        // Restore sidebar scroll position after navigation
        this.restoreSidebarScroll();
      });
  }

  private loadLicenseInfo(): void {
    // Clear cache to ensure fresh data
    this.licenseService.clearCache();
    
    combineLatest([
      this.licenseService.getPlanType().pipe(catchError(() => of('free' as PlanType))),
      this.licenseService.isEnterprise().pipe(catchError(() => of(false))),
      this.licenseService.isPremium().pipe(catchError(() => of(false))),
      this.licenseService.isStandard().pipe(catchError(() => of(false))),
      this.licenseService.isPayrollEnabled().pipe(catchError(() => of(false))),
      this.licenseService.isInventoryEnabled().pipe(catchError(() => of(false))),
    ]).pipe(
      takeUntil(this.destroy$),
    ).subscribe(([planType, isEnterprise, isPremium, isStandard, isPayrollEnabled, isInventoryEnabled]) => {
      this.planType = planType;
      this.isEnterprise = isEnterprise;
      this.isPremium = isPremium;
      this.isStandard = isStandard;
      this.isPayrollEnabled = isPayrollEnabled;
      this.isInventoryEnabled = isInventoryEnabled;
      console.log('[ShellComponent] License info loaded:', {
        planType,
        isPayrollEnabled,
        isInventoryEnabled,
      });
      this.updateShellFromRoute();
    });
  }

  ngAfterViewInit(): void {
    // Save scroll position when sidebar is scrolled
    // Use a small delay to ensure the element is available
    setTimeout(() => {
      this.attachScrollListener();
    }, 200);
  }

  private attachScrollListener(): void {
    if (this.sideNavList) {
      const element = this.sideNavList.nativeElement;
      // Find the actual scrollable container - could be the element itself or a parent
      const scrollableElement = this.findScrollableElement(element);
      
      if (scrollableElement) {
        scrollableElement.addEventListener('scroll', () => {
          this.sidebarScrollPosition = scrollableElement.scrollTop;
        }, { passive: true });
      }
    }
  }

  private findScrollableElement(element: HTMLElement): HTMLElement | null {
    // Check if element itself is scrollable
    const style = getComputedStyle(element);
    if ((style.overflow === 'auto' || style.overflowY === 'auto' || style.overflow === 'scroll' || style.overflowY === 'scroll') &&
        element.scrollHeight > element.clientHeight) {
      return element;
    }
    
    // Check parent elements
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentStyle = getComputedStyle(parent);
      if ((parentStyle.overflow === 'auto' || parentStyle.overflowY === 'auto' || 
           parentStyle.overflow === 'scroll' || parentStyle.overflowY === 'scroll') &&
          parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }
    
    // Fallback: return the element itself
    return element;
  }

  private restoreSidebarScroll(): void {
    // Use setTimeout to ensure DOM is updated after navigation
    setTimeout(() => {
      if (this.sideNavList && this.sidebarScrollPosition > 0) {
        const element = this.sideNavList.nativeElement;
        const scrollableElement = this.findScrollableElement(element);
        
        if (scrollableElement) {
          scrollableElement.scrollTop = this.sidebarScrollPosition;
        }
      }
    }, 100);
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
    this.autoExpandActiveGroups();
  }

  toggleNavGroup(itemLabel: string): void {
    if (this.expandedGroups.has(itemLabel)) {
      this.expandedGroups.delete(itemLabel);
    } else {
      this.expandedGroups.add(itemLabel);
    }
  }

  isNavGroupExpanded(itemLabel: string): boolean {
    return this.expandedGroups.has(itemLabel);
  }

  private autoExpandActiveGroups(): void {
    const currentUrl = this.router.url.split('?')[0]; // Get path without query params
    const currentQueryParams = this.route.snapshot.queryParams;
    
    this.navItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        // Check if any child route matches the current URL
        const hasActiveChild = item.children.some((child) => {
          if (!child.route) return false;
          
          // Check route path match
          const routeMatches = currentUrl === child.route || currentUrl.startsWith(child.route + '/');
          
          // If child has query params, check if they match
          if (routeMatches && child.queryParams) {
            return Object.keys(child.queryParams).every(
              (key) => currentQueryParams[key] === child.queryParams?.[key]
            );
          }
          
          return routeMatches;
        });
        
        if (hasActiveChild) {
          this.expandedGroups.add(item.label);
        }
      }
    });
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
      const label = item.label?.toLowerCase() || '';
      const route = item.route || '';
      
      // For Standard license: Only show Sales module
      if (this.isStandard) {
        if (label === 'sales') {
          // Include Sales module and filter its children
          if (item.children) {
            item.children = this.filterNavItemsByLicense(item.children);
            return item.children.length > 0;
          }
          return true;
        }
        // Keep other modules visible but disabled (locked) for Standard
        item.disabled = true;
        item.disabledReason = 'Upgrade your plan to unlock this feature';
        if (item.children) {
          item.children = this.filterNavItemsByLicense(item.children);
        }
        return true;
      }
      
      // For Premium and Enterprise: Show all modules
      // But Premium will have upload expense disabled (handled in employee module)
      
      // Check children too
      if (item.children) {
        const filteredChildren = this.filterNavItemsByLicense(item.children);
        item.children = filteredChildren;
      }
      
      // Filter out enterprise-only features if not enterprise
      const isBankReconciliation = route.includes('bank-reconciliation');
      const isReminders = route.includes('reminders') || route.includes('notifications');
      const isUploadDocument = route.includes('/upload') && !route.includes('bank-reconciliation');
      
      // Enterprise has all features, Premium has all except upload expense (but can see it)
      // Standard is already handled above
      if (!this.isEnterprise && (isBankReconciliation || isReminders)) {
        return false;
      }
      
      // For Standard license in employee portal: Hide upload expense nav item
      // (Premium users can see it but functionality is disabled in component)
      if (this.isStandard && isUploadDocument) {
        return false;
      }
      
      // Payroll feature flag: keep visible but disabled when off
      if (label === 'payroll' || route.includes('/payroll')) {
        if (!this.isPayrollEnabled) {
          item.disabled = true;
          item.disabledReason = 'Payroll is not enabled for this organization';
        }
        return true;
      }
      
      // Inventory feature flag: keep visible but disabled when off
      if (label === 'inventory' || route.includes('/inventory')) {
        if (!this.isInventoryEnabled) {
          item.disabled = true;
          item.disabledReason = 'Inventory is not enabled for this organization';
        }
        return true;
      }

      // Inventory-controlled report: Stock Balance should only be visible when inventory is enabled
      const isStockBalanceReport =
        route.includes('/reports/stock-balance') || label.includes('stock balance');
      if (isStockBalanceReport) {
        if (!this.isInventoryEnabled) {
          item.disabled = true;
          item.disabledReason = 'Inventory is not enabled for this organization';
        }
        return true;
      }
      
      return true;
    });
  }

  isNavItemDisabled(item: ShellNavItemConfig): boolean {
    return Boolean(item.disabled);
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

