export type ReportType =
  | 'trial_balance'
  | 'balance_sheet'
  | 'profit_and_loss'
  | 'payables'
  | 'receivables'
  | 'vat_control_account'
  | 'stock_balance'
  | 'general_ledger';

export interface ReportHistoryItem {
  id: string;
  type: ReportType;
  filters: Record<string, any>;
  fileUrl?: string;
  /** ISO date string when the report was generated */
  createdAt: string;
  /** Backend may send created_at (snake_case) */
  created_at?: string;
}

export interface ReportHistoryPage {
  items: ReportHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GeneratedReport<T = any> {
  type: ReportType;
  generatedAt: string;
  data: T;
}
