import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LicenseKey, UploadUsage } from '../models/license-key.model';
import { Observable } from 'rxjs';
import { PlanType } from '../models/plan.model';
import { Region } from '../models/organization.model';

export interface CreateLicenseKeyPayload {
  planType?: PlanType;
  maxUsers?: number;
  storageQuotaMb?: number;
  maxUploads?: number;
  notes?: string;
  validityDays?: number;
  email: string;
  region?: Region;
}

export interface AllocateUploadsPayload {
  additionalUploads: number;
}

export interface RenewLicenseKeyPayload {
  extendByDays?: number;
  newExpiry?: string;
}

export interface UpdateLicenseFeaturesPayload {
  enablePayroll?: boolean;
  enableInventory?: boolean;
  enableBulkJournalImport?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LicenseKeysService {
  constructor(private readonly api: ApiService) {}

  list(): Observable<LicenseKey[]> {
    return this.api.get<LicenseKey[]>('/license-keys');
  }

  create(payload: CreateLicenseKeyPayload): Observable<LicenseKey> {
    return this.api.post<LicenseKey>('/license-keys', payload);
  }

  renew(id: string, payload: RenewLicenseKeyPayload): Observable<LicenseKey> {
    return this.api.patch<LicenseKey>(`/license-keys/${id}/renew`, payload);
  }

  revoke(id: string): Observable<LicenseKey> {
    return this.api.patch<LicenseKey>(`/license-keys/${id}/revoke`, {});
  }

  allocateUploads(
    id: string,
    payload: AllocateUploadsPayload,
  ): Observable<LicenseKey> {
    return this.api.patch<LicenseKey>(
      `/license-keys/${id}/allocate-uploads`,
      payload,
    );
  }

  getUploadUsage(organizationId: string): Observable<UploadUsage> {
    return this.api.get<UploadUsage>(
      `/license-keys/organization/${organizationId}/upload-usage`,
    );
  }

  getByOrganizationId(organizationId: string): Observable<LicenseKey | null> {
    return this.api.get<LicenseKey | null>(
      `/license-keys/organization/${organizationId}`,
    );
  }

  updateFeatures(
    id: string,
    payload: UpdateLicenseFeaturesPayload,
  ): Observable<LicenseKey> {
    return this.api.patch<LicenseKey>(
      `/license-keys/${id}/features`,
      payload,
    );
  }
}

