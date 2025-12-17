export type ReportType =
  | 'trial_balance'
  | 'balance_sheet'
  | 'profit_and_loss'
  | 'payables'
  | 'receivables';

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
