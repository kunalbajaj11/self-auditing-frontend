import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { OrganizationService } from './organization.service';
import { LicenseKeysService } from './license-keys.service';
import { PlanType } from '../models/plan.model';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private cachedOrganization: { planType: PlanType } | null = null;

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly licenseKeysService: LicenseKeysService,
  ) {}

  /**
   * Clear cached organization data to force refresh
   */
  clearCache(): void {
    this.cachedOrganization = null;
  }

  /**
   * Get the current organization's plan type
   */
  getPlanType(): Observable<PlanType> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => {
        this.cachedOrganization = { planType: org.planType };
        return org.planType;
      }),
    );
  }

  /**
   * Check if the current organization has an Enterprise license
   */
  isEnterprise(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => {
        this.cachedOrganization = { planType: org.planType };
        return org.planType === 'enterprise';
      }),
    );
  }

  /**
   * Check if the current organization has a Premium license
   */
  isPremium(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => {
        this.cachedOrganization = { planType: org.planType };
        return org.planType === 'premium';
      }),
    );
  }

  /**
   * Check if the current organization has a Standard license
   */
  isStandard(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => {
        this.cachedOrganization = { planType: org.planType };
        return org.planType === 'standard';
      }),
    );
  }

  /**
   * Check if upload expense feature is enabled (Enterprise only)
   */
  canUploadExpense(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => {
        this.cachedOrganization = { planType: org.planType };
        return org.planType === 'enterprise';
      }),
    );
  }

  /**
   * Check if Sales module is enabled (Standard, Premium, Enterprise)
   */
  isSalesModuleEnabled(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => {
        this.cachedOrganization = { planType: org.planType };
        return ['standard', 'premium', 'enterprise'].includes(org.planType);
      }),
    );
  }

  /**
   * Check if non-Sales modules are enabled (Premium, Enterprise)
   */
  areOtherModulesEnabled(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => {
        this.cachedOrganization = { planType: org.planType };
        return ['premium', 'enterprise'].includes(org.planType);
      }),
    );
  }

  /**
   * Check if the provided plan type is Enterprise
   */
  isEnterprisePlan(planType: PlanType): boolean {
    return planType === 'enterprise';
  }

  /**
   * Get cached organization plan type (if available)
   */
  getCachedPlanType(): PlanType | null {
    return this.cachedOrganization?.planType ?? null;
  }

  /**
   * Check if cached plan type is Enterprise (without API call)
   */
  isEnterpriseCached(): boolean {
    return this.cachedOrganization?.planType === 'enterprise';
  }

  /**
   * Check if cached plan type is Premium (without API call)
   */
  isPremiumCached(): boolean {
    return this.cachedOrganization?.planType === 'premium';
  }

  /**
   * Check if cached plan type is Standard (without API call)
   */
  isStandardCached(): boolean {
    return this.cachedOrganization?.planType === 'standard';
  }

  /**
   * Check if upload expense is enabled (cached, without API call)
   */
  canUploadExpenseCached(): boolean {
    return this.cachedOrganization?.planType === 'enterprise';
  }

  /**
   * Check if payroll feature is enabled for the current organization
   * Features are controlled directly on the organization, not via license key
   */
  isPayrollEnabled(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => org.enablePayroll ?? false),
      catchError((error) => {
        console.error('[LicenseService] Error getting organization for payroll check:', error);
        return of(false);
      }),
    );
  }

  /**
   * Check if inventory feature is enabled for the current organization
   * Features are controlled directly on the organization, not via license key
   */
  isInventoryEnabled(): Observable<boolean> {
    return this.organizationService.getMyOrganization().pipe(
      map((org) => org.enableInventory ?? false),
      catchError((error) => {
        console.error('[LicenseService] Error getting organization for inventory check:', error);
        return of(false);
      }),
    );
  }
}

