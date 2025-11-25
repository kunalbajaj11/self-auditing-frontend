import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'export';
  changes?: Record<string, any>;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
  } | null;
  timestamp: string;
  ipAddress?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  constructor(private readonly api: ApiService) {}

  listForMyOrganization(filters?: Record<string, any>): Observable<AuditLogItem[]> {
    return this.api.get<AuditLogItem[]>('/audit-logs', filters);
  }

  listForOrganization(
    organizationId: string,
    filters?: Record<string, any>,
  ): Observable<AuditLogItem[]> {
    return this.api.get<AuditLogItem[]>(
      `/audit-logs/organization/${organizationId}`,
      filters,
    );
  }
}
