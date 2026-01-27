import { PlanType } from './plan.model';

export type Region = 'UAE' | 'SAUDI' | 'OMAN' | 'KUWAIT' | 'BAHRAIN' | 'QATAR' | 'INDIA';

export interface Organization {
  id: string;
  name: string;
  planType: PlanType;
  status: 'active' | 'inactive';
  currency: string;
  baseCurrency?: string;
  storageQuotaMb?: number | null;
  vatNumber?: string;
  address?: string;
  contactPerson?: string;
  contactEmail?: string;
  region?: Region;
  enablePayroll?: boolean;
  enableInventory?: boolean;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIban?: string;
  bankBranch?: string;
  bankSwiftCode?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  planType: PlanType;
  createdAt?: string;
  plan?: {
    id: string;
    name: string;
  } | null;
}
