import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Organization, OrganizationSummary } from '../models/organization.model';
import { PlanType } from '../models/plan.model';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  constructor(private readonly api: ApiService) {}

  getOrganizations(): Observable<OrganizationSummary[]> {
    return this.api.get<OrganizationSummary[]>('/organizations');
  }

  getMyOrganization(): Observable<Organization> {
    return this.api.get<Organization>('/organizations/me');
  }

  updateMyOrganization(payload: Partial<Organization>): Observable<Organization> {
    return this.api.patch<Organization>('/organizations/me', payload);
  }

  getOrganization(id: string): Observable<Organization> {
    return this.api.get<Organization>(`/organizations/${id}`);
  }

  createOrganization(payload: {
    name: string;
    planType: PlanType;
    vatNumber?: string;
    address?: string;
    currency?: string;
    fiscalYearStart?: string;
    contactPerson?: string;
    contactEmail?: string;
    storageQuotaMb?: number;
  }): Observable<Organization> {
    return this.api.post<Organization>('/organizations', payload);
  }

  updateOrganization(id: string, payload: Partial<Organization>): Observable<Organization> {
    return this.api.patch<Organization>(`/organizations/${id}`, payload);
  }

  changeStatus(id: string, status: 'active' | 'inactive'): Observable<Organization> {
    return this.api.patch<Organization>(`/organizations/${id}/status`, { status });
  }

  activateWithExpiry(id: string, expiryDate: string): Observable<Organization> {
    return this.api.patch<Organization>(`/organizations/${id}/activate`, {
      expiryDate,
    });
  }

  upgradeLicense(id: string, licenseKey: string): Observable<Organization> {
    return this.api.post<Organization>(`/organizations/${id}/upgrade-license`, {
      licenseKey,
    });
  }

  isEnterprise(planType: PlanType): boolean {
    return planType === 'enterprise';
  }
}
