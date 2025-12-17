import { PlanType } from './plan.model';

export type LicenseKeyStatus = 'active' | 'consumed' | 'expired' | 'revoked';

export interface LicenseKey {
  id: string;
  key: string;
  status: LicenseKeyStatus;
  planType?: PlanType | null;
  maxUsers?: number | null;
  storageQuotaMb?: number | null;
  maxUploads: number;
  allocatedUploads: number;
  expiresAt: string;
  consumedAt?: string | null;
  consumedByOrganizationId?: string | null;
  consumedByUserId?: string | null;
  notes?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadUsage {
  maxUploads: number;
  allocatedUploads: number;
  totalAllowed: number;
  usedUploads: number;
  remainingUploads: number;
}

