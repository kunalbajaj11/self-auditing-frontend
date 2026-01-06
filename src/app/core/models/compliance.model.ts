export enum ComplianceType {
  VAT_RETURN = 'vat_return',
  TDS_RETURN = 'tds_return',
  EPF_CHALLAN = 'epf_challan',
  ESI_CHALLAN = 'esi_challan',
  PROFESSIONAL_TAX = 'professional_tax',
  GSTR_1 = 'gstr_1',
  GSTR_3B = 'gstr_3b',
  ANNUAL_RETURN = 'annual_return',
}

export enum FilingFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  AD_HOC = 'ad_hoc',
}

export enum DeadlineStatus {
  PENDING = 'pending',
  UPCOMING = 'upcoming',
  DUE_TODAY = 'due_today',
  OVERDUE = 'overdue',
  FILED = 'filed',
  EXTENDED = 'extended',
}

export interface ComplianceDeadline {
  id: string;
  complianceType: ComplianceType;
  region?: string;
  period: string;
  dueDate: string;
  filingFrequency: FilingFrequency;
  status: DeadlineStatus;
  reminderSent30d: boolean;
  reminderSent15d: boolean;
  reminderSent7d: boolean;
  reminderSent1d: boolean;
  reminderSentDue: boolean;
  reminderSentOverdue: boolean;
  filedAt?: string;
  filingReference?: string;
  notes?: string;
  extendedDueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceSummary {
  organization: {
    id: string;
    name: string;
    region: string;
  };
  period: string;
  deadlines: {
    total: number;
    pending: number;
    upcoming: number;
    dueToday: number;
    overdue: number;
    filed: number;
  };
  forms: {
    total: number;
    draft: number;
    generated: number;
    filed: number;
  };
  byType: Record<ComplianceType, {
    deadlines: number;
    filed: number;
    pending: number;
    overdue: number;
  }>;
}

export interface CreateDeadlineRequest {
  complianceType: ComplianceType;
  period: string;
  dueDate: string;
  filingFrequency: FilingFrequency;
}

export interface GenerateDeadlinesRequest {
  complianceType: ComplianceType;
  startDate: string;
  endDate: string;
  filingFrequency: FilingFrequency;
}

