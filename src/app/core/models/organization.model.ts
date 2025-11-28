import { PlanType } from './plan.model';

export interface Organization {
  id: string;
  name: string;
  planType: PlanType;
  status: 'active' | 'inactive';
  currency: string;
  baseCurrency?: string;
  storageQuotaMb: number;
  vatNumber?: string;
  address?: string;
  contactPerson?: string;
  contactEmail?: string;
  fiscalYearStart?: string;
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
