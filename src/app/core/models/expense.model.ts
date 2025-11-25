export type ExpenseType =
  | 'expense'
  | 'credit'
  | 'adjustment'
  | 'advance'
  | 'accrual'
  | 'fixed_assets'
  | 'share_capital'
  | 'retained_earnings'
  | 'shareholder_account'
  | 'cost_of_sales';

export type ExpenseStatus = 'pending' | 'approved' | 'settled' | 'auto_settled';

export interface Attachment {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileKey?: string; // S3 file key for signed URL generation
  fileType: string;
  fileSize: number;
}

export interface Expense {
  id: string;
  type: ExpenseType;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  expenseDate: string;
  expectedPaymentDate?: string;
  vendorName?: string;
  vendorTrn?: string;
  description?: string;
  status: ExpenseStatus;
  ocrConfidence?: number;
  linkedAccrualExpenseId?: string;
  attachments?: Attachment[];
}

export interface AccrualSummary {
  id: string;
  status: 'pending_settlement' | 'settled' | 'auto_settled';
  amount: number;
  expectedPaymentDate: string;
  vendorName?: string;
}
