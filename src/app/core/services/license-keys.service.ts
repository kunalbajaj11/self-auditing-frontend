import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LicenseKey } from '../models/license-key.model';
import { Observable } from 'rxjs';
import { PlanType } from '../models/plan.model';

export interface CreateLicenseKeyPayload {
  planType?: PlanType;
  maxUsers?: number;
  storageQuotaMb?: number;
  notes?: string;
  validityDays?: number;
  email: string;
}

export interface RenewLicenseKeyPayload {
  extendByDays?: number;
  newExpiry?: string;
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
}

