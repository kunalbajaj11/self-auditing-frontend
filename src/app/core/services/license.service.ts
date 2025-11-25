import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { OrganizationService } from './organization.service';
import { PlanType } from '../models/plan.model';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private cachedOrganization: { planType: PlanType } | null = null;

  constructor(private readonly organizationService: OrganizationService) {}

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
}

