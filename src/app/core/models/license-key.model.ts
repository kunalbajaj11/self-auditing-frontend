import { PlanType } from './plan.model';
import { Region } from './organization.model';

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
  region?: Region | null;
  enablePayroll?: boolean;
  enableInventory?: boolean;
  enableBulkJournalImport?: boolean;
  createdAt: string;
  updatedAt: string;
  organizationName?: string | null;
}

export interface UploadUsage {
  maxUploads: number;
  allocatedUploads: number;
  totalAllowed: number;
  usedUploads: number;
  remainingUploads: number;
}

