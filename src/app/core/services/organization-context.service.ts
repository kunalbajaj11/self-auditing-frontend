import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, take, tap } from 'rxjs/operators';
import { OrganizationService } from './organization.service';
import type { Organization, Region } from '../models/organization.model';
import { currencyForRegion } from '../constants/region-default-currency';

/**
 * Cached organization region/currency for UI defaults (India → INR/GST, GCC → AED/VAT, etc.).
 * Hydrated from {@link OrganizationService#getMyOrganization} (e.g. Shell on init).
 */
@Injectable({ providedIn: 'root' })
export class OrganizationContextService {
  /** ISO currency code for display defaults until / after API load */
  readonly currency = signal<string>('AED');

  readonly region = signal<Region | null>(null);

  private lastOrg: Organization | null = null;

  constructor(private readonly organizationService: OrganizationService) {}

  /** Load org from API and update signals. Safe to call multiple times. */
  refresh(): void {
    this.organizationService
      .getMyOrganization()
      .pipe(
        take(1),
        tap((org) => this.applyOrganization(org)),
        catchError(() => {
          this.applyOrganization(null);
          return of(null);
        }),
      )
      .subscribe();
  }

  /** One-shot observable for dialogs that need org after context is warm */
  whenReady(): Observable<Organization | null> {
    return this.organizationService.getMyOrganization().pipe(
      take(1),
      tap((org) => this.applyOrganization(org)),
      catchError(() => of(null)),
    );
  }

  applyOrganization(org: Organization | null): void {
    this.lastOrg = org;
    const code = org?.currency?.trim();
    this.currency.set(
      code && code.length > 0 ? code : currencyForRegion(org?.region),
    );
    this.region.set(org?.region ?? null);
  }

  snapshot(): Organization | null {
    return this.lastOrg;
  }

  isIndia(): boolean {
    return this.region() === 'INDIA';
  }

  /** Table column / field caption */
  taxAmountLabel(): string {
    return this.isIndia() ? 'GST' : 'VAT';
  }

  /** Registration number field label */
  taxRegistrationLabel(): string {
    return this.isIndia() ? 'GST Number' : 'VAT Number';
  }
}
