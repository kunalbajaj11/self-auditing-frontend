export interface BankTransaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: string;
  type: 'credit' | 'debit';
  balance?: string | null;
  reference?: string | null;
  sourceFile: string;
  status: 'unmatched' | 'matched' | 'pending';
  reconciliationRecordId?: string;
  uploadedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemTransaction {
  id: string;
  transactionDate: string;
  description: string;
  amount: string;
  type: 'credit' | 'debit';
  expenseId?: string | null;
  status: 'unmatched' | 'matched' | 'pending';
  reconciliationRecordId?: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReconciliationRecord {
  id: string;
  reconciliationDate: string;
  statementPeriodStart: string;
  statementPeriodEnd: string;
  totalBankCredits: string;
  totalBankDebits: string;
  totalMatched: number;
  totalUnmatched: number;
  adjustmentsCount: number;
  closingBalance?: string | null;
  systemClosingBalance?: string | null;
  notes?: string | null;
  organizationId: string;
  createdById?: string | null;
  bankTransactions?: BankTransaction[];
  systemTransactions?: SystemTransaction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchTransactionsRequest {
  bankTransactionId: string;
  systemTransactionId: string;
  notes?: string;
}

export interface ManualEntryRequest {
  transactionDate: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  categoryId?: string;
  notes?: string;
  reconciliationRecordId: string;
}

