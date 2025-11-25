import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  tap,
} from 'rxjs/operators';
import {
  SuperAdminDashboardMetrics,
  SuperAdminService,
  OrganizationUsage,
} from '../../../core/services/super-admin.service';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss'],
})
export class SuperAdminDashboardComponent implements OnInit {
  metrics$!: Observable<SuperAdminDashboardMetrics | null>;
  topOrganizations$!: Observable<OrganizationUsage[]>;
  error: string | null = null;
  loading = false;

  constructor(private readonly superAdminService: SuperAdminService) {}

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;
    this.metrics$ = this.superAdminService.dashboard().pipe(
      tap(() => (this.loading = false)),
      catchError(() => {
        this.error = 'Unable to load dashboard metrics right now.';
        this.loading = false;
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.topOrganizations$ = this.superAdminService
      .usage()
      .pipe(
        map((usage) =>
          usage
            .slice()
            .sort((a, b) => {
              // Primary sort: by ranking score (descending)
              if (b.rankingScore !== a.rankingScore) {
                return b.rankingScore - a.rankingScore;
              }
              // Secondary sort: by expense count (descending)
              if (b.expenseCount !== a.expenseCount) {
                return b.expenseCount - a.expenseCount;
              }
              // Tertiary sort: by user count (descending)
              return b.userCount - a.userCount;
            })
            .slice(0, 5),
        ),
        catchError(() => of([])),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
  }
}

