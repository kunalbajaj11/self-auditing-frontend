export type ReportType =
  | 'expense_summary'
  | 'expense_detail'
  | 'accrual_report'
  | 'vat_report'
  | 'vendor_report'
  | 'employee_report'
  | 'trend_report'
  | 'audit_trail'
  | 'bank_reconciliation'
  | 'attachments_report'
  | 'trial_balance';

export interface ReportHistoryItem {
  id: string;
  type: ReportType;
  filters: Record<string, any>;
  fileUrl?: string;
  createdAt: string;
}

export interface GeneratedReport<T = any> {
  type: ReportType;
  generatedAt: string;
  data: T;
}
