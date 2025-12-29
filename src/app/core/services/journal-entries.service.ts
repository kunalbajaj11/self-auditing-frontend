import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export enum JournalEntryAccount {
  // Assets
  CASH_BANK = 'cash_bank',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  VAT_RECEIVABLE = 'vat_receivable',
  PREPAID_EXPENSES = 'prepaid_expenses',
  
  // Liabilities
  ACCOUNTS_PAYABLE = 'accounts_payable',
  VAT_PAYABLE = 'vat_payable',
  CUSTOMER_ADVANCES = 'customer_advances',
  
  // Equity
  SHARE_CAPITAL = 'share_capital',
  OWNER_SHAREHOLDER_ACCOUNT = 'owner_shareholder_account',
  RETAINED_EARNINGS = 'retained_earnings',
  
  // Revenue
  SALES_REVENUE = 'sales_revenue',
  
  // Expense
  GENERAL_EXPENSE = 'general_expense',
}

export interface AccountMetadata {
  code: JournalEntryAccount;
  name: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  isReadOnly?: boolean;
}

export const ACCOUNT_METADATA: Record<JournalEntryAccount, AccountMetadata> = {
  [JournalEntryAccount.CASH_BANK]: {
    code: JournalEntryAccount.CASH_BANK,
    name: 'Cash/Bank',
    category: 'asset',
  },
  [JournalEntryAccount.ACCOUNTS_RECEIVABLE]: {
    code: JournalEntryAccount.ACCOUNTS_RECEIVABLE,
    name: 'Accounts Receivable',
    category: 'asset',
  },
  [JournalEntryAccount.VAT_RECEIVABLE]: {
    code: JournalEntryAccount.VAT_RECEIVABLE,
    name: 'VAT Receivable',
    category: 'asset',
  },
  [JournalEntryAccount.PREPAID_EXPENSES]: {
    code: JournalEntryAccount.PREPAID_EXPENSES,
    name: 'Prepaid Expenses',
    category: 'asset',
  },
  [JournalEntryAccount.ACCOUNTS_PAYABLE]: {
    code: JournalEntryAccount.ACCOUNTS_PAYABLE,
    name: 'Accounts Payable',
    category: 'liability',
  },
  [JournalEntryAccount.VAT_PAYABLE]: {
    code: JournalEntryAccount.VAT_PAYABLE,
    name: 'VAT Payable',
    category: 'liability',
  },
  [JournalEntryAccount.CUSTOMER_ADVANCES]: {
    code: JournalEntryAccount.CUSTOMER_ADVANCES,
    name: 'Customer Advances / Unapplied Credits',
    category: 'liability',
  },
  [JournalEntryAccount.SHARE_CAPITAL]: {
    code: JournalEntryAccount.SHARE_CAPITAL,
    name: 'Share Capital',
    category: 'equity',
  },
  [JournalEntryAccount.OWNER_SHAREHOLDER_ACCOUNT]: {
    code: JournalEntryAccount.OWNER_SHAREHOLDER_ACCOUNT,
    name: 'Owner/Shareholder Account',
    category: 'equity',
  },
  [JournalEntryAccount.RETAINED_EARNINGS]: {
    code: JournalEntryAccount.RETAINED_EARNINGS,
    name: 'Retained Earnings',
    category: 'equity',
    isReadOnly: true,
  },
  [JournalEntryAccount.SALES_REVENUE]: {
    code: JournalEntryAccount.SALES_REVENUE,
    name: 'Sales Revenue',
    category: 'revenue',
  },
  [JournalEntryAccount.GENERAL_EXPENSE]: {
    code: JournalEntryAccount.GENERAL_EXPENSE,
    name: 'General Expense',
    category: 'expense',
  },
};

export function getAccountsByCategory(): Record<string, AccountMetadata[]> {
  const grouped: Record<string, AccountMetadata[]> = {
    asset: [],
    liability: [],
    equity: [],
    revenue: [],
    expense: [],
  };

  Object.values(ACCOUNT_METADATA).forEach((account) => {
    grouped[account.category].push(account);
  });

  return grouped;
}

export interface JournalEntry {
  id: string;
  debitAccount: JournalEntryAccount;
  creditAccount: JournalEntryAccount;
  amount: number;
  entryDate: string;
  description?: string | null;
  referenceNumber?: string | null;
  customerVendorId?: string | null;
  customerVendorName?: string | null;
  vendorTrn?: string | null;
  vatAmount?: number | null;
  vatTaxType?: string | null;
  subAccount?: string | null;
  attachmentId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateJournalEntryPayload {
  debitAccount: JournalEntryAccount;
  creditAccount: JournalEntryAccount;
  amount: number;
  entryDate: string;
  description?: string;
  referenceNumber?: string;
  customerVendorId?: string;
  customerVendorName?: string;
  vendorTrn?: string;
  vatAmount?: number;
  vatTaxType?: string;
  subAccount?: string;
  attachmentId?: string;
  notes?: string;
}

export interface UpdateJournalEntryPayload {
  debitAccount?: JournalEntryAccount;
  creditAccount?: JournalEntryAccount;
  amount?: number;
  entryDate?: string;
  description?: string;
  referenceNumber?: string;
  customerVendorId?: string;
  customerVendorName?: string;
  vendorTrn?: string;
  vatAmount?: number;
  vatTaxType?: string;
  subAccount?: string;
  attachmentId?: string;
  notes?: string;
}

export interface JournalEntryFilters {
  debitAccount?: JournalEntryAccount;
  creditAccount?: JournalEntryAccount;
  startDate?: string;
  endDate?: string;
  description?: string;
  referenceNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class JournalEntriesService {
  constructor(private readonly api: ApiService) {}

  listEntries(filters?: JournalEntryFilters): Observable<JournalEntry[]> {
    return this.api.get<JournalEntry[]>('/journal-entries', filters);
  }

  getEntry(id: string): Observable<JournalEntry> {
    return this.api.get<JournalEntry>(`/journal-entries/${id}`);
  }

  createEntry(payload: CreateJournalEntryPayload): Observable<JournalEntry> {
    return this.api.post<JournalEntry>('/journal-entries', payload);
  }

  updateEntry(id: string, payload: UpdateJournalEntryPayload): Observable<JournalEntry> {
    return this.api.patch<JournalEntry>(`/journal-entries/${id}`, payload);
  }

  deleteEntry(id: string): Observable<void> {
    return this.api.delete<void>(`/journal-entries/${id}`);
  }
}

