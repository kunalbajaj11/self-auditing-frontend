import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OrganizationService } from './organization.service';
import { PlanType } from '../models/plan.model';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private cachedOrganization: { planType: PlanType } | null = null;

  constructor(private readonly organizationService: OrganizationService) {}

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
}

