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

export interface Attachment {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileKey?: string; // S3 file key for signed URL generation
  fileType: string;
  fileSize: number;
}

export type VatTaxType = 'standard' | 'zero_rated' | 'exempt' | 'reverse_charge';

export interface PurchaseLineItem {
  id?: string;
  productId?: string;
  itemName: string;
  sku?: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  amount: number;
  vatRate?: number;
  vatAmount: number;
  vatTaxType?: VatTaxType;
  totalAmount: number;
  description?: string;
  lineNumber?: number;
}

export interface Expense {
  id: string;
  type: ExpenseType;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  vatTaxType?: VatTaxType;
  currency: string;
  expenseDate: string;
  expectedPaymentDate?: string;
  purchaseStatus?: string; // 'Purchase - Cash Paid' or 'Purchase - Accruals'
  vendorName?: string;
  vendorTrn?: string;
  invoiceNumber?: string;
  description?: string;
  ocrConfidence?: number;
  linkedAccrualExpenseId?: string;
  attachments?: Attachment[];
  lineItems?: PurchaseLineItem[]; // For item-wise purchase entry
}

export interface AccrualSummary {
  id: string;
  status: 'pending_settlement' | 'settled' | 'auto_settled';
  amount: number;
  expectedPaymentDate: string;
  vendorName?: string;
}
