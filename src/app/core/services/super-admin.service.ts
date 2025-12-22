import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SuperAdminDashboardMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  inactiveOrganizations: number;
  totalUsers: number;
  totalExpensesProcessed: number;
  totalAccruals: number;
  pendingAccruals: number;
  storageUsedMb: number;
  latestAuditLogs: Array<{
    id: string;
    organizationId: string;
    entityType: string;
    action: string;
    timestamp: string;
  }>;
}

export interface OrganizationUsage {
  id: string;
  name: string;
  planType: string;
  status: string;
  userCount: number;
  expenseCount: number;
  accrualCount: number;
  storageUsedMb: number;
  rankingScore: number; // Combined score for sorting
  createdAt: string;
  licenseExpiresAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private readonly api: ApiService) {}

  dashboard(): Observable<SuperAdminDashboardMetrics> {
    return this.api.get<SuperAdminDashboardMetrics>('/super-admin/dashboard');
  }

  usage(): Observable<OrganizationUsage[]> {
    return this.api.get<OrganizationUsage[]>('/super-admin/usage');
  }
}

