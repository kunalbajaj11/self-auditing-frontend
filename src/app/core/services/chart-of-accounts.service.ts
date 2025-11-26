import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountSubType {
  CURRENT_ASSET = 'current_asset',
  FIXED_ASSET = 'fixed_asset',
  NON_CURRENT_ASSET = 'non_current_asset',
  BANK = 'bank',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  INVENTORY = 'inventory',
  CURRENT_LIABILITY = 'current_liability',
  NON_CURRENT_LIABILITY = 'non_current_liability',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  VAT_PAYABLE = 'vat_payable',
  ACCRUED_LIABILITY = 'accrued_liability',
  CAPITAL = 'capital',
  RETAINED_EARNINGS = 'retained_earnings',
  SALES_REVENUE = 'sales_revenue',
  SERVICE_REVENUE = 'service_revenue',
  OTHER_REVENUE = 'other_revenue',
  COST_OF_GOODS_SOLD = 'cost_of_goods_sold',
  OPERATING_EXPENSE = 'operating_expense',
  ADMINISTRATIVE_EXPENSE = 'administrative_expense',
  DEPRECIATION = 'depreciation',
}

export interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubType?: AccountSubType | null;
  parentAccountId?: string | null;
  parentAccount?: ChartOfAccount | null;
  children?: ChartOfAccount[];
  description?: string | null;
  isActive: boolean;
  isSystemDefault: boolean;
  openingBalance: string;
  currentBalance: string;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChartOfAccountPayload {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubType?: AccountSubType;
  parentAccountId?: string;
  description?: string;
  isActive?: boolean;
  openingBalance?: number;
  currency?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ChartOfAccountsService {
  constructor(private readonly api: ApiService) {}

  listAccounts(filters?: {
    accountType?: AccountType;
    isActive?: boolean;
    search?: string;
  }): Observable<ChartOfAccount[]> {
    const params: Record<string, any> = {};
    if (filters?.accountType) params['accountType'] = filters.accountType;
    if (filters?.isActive !== undefined) params['isActive'] = filters.isActive;
    if (filters?.search) params['search'] = filters.search;
    return this.api.get<ChartOfAccount[]>('/chart-of-accounts', params);
  }

  getAccountTree(filters?: {
    accountType?: AccountType;
    isActive?: boolean;
    search?: string;
  }): Observable<ChartOfAccount[]> {
    const params: Record<string, any> = {};
    if (filters?.accountType) params['accountType'] = filters.accountType;
    if (filters?.isActive !== undefined) params['isActive'] = filters.isActive;
    if (filters?.search) params['search'] = filters.search;
    return this.api.get<ChartOfAccount[]>('/chart-of-accounts/tree', params);
  }

  getAccount(id: string): Observable<ChartOfAccount> {
    return this.api.get<ChartOfAccount>(`/chart-of-accounts/${id}`);
  }

  createAccount(payload: CreateChartOfAccountPayload): Observable<ChartOfAccount> {
    return this.api.post<ChartOfAccount>('/chart-of-accounts', payload);
  }

  updateAccount(id: string, payload: Partial<CreateChartOfAccountPayload>): Observable<ChartOfAccount> {
    return this.api.patch<ChartOfAccount>(`/chart-of-accounts/${id}`, payload);
  }

  deleteAccount(id: string): Observable<void> {
    return this.api.delete<void>(`/chart-of-accounts/${id}`);
  }
}

