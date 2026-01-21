import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface LedgerAccount {
  id: string;
  name: string;
  description?: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  isSystemDefault: boolean;
}

@Injectable({ providedIn: 'root' })
export class LedgerAccountsService {
  constructor(private readonly api: ApiService) {}

  listLedgerAccounts(): Observable<LedgerAccount[]> {
    return this.api.get<LedgerAccount[]>('/ledger-accounts');
  }

  createLedgerAccount(payload: {
    name: string;
    description?: string;
    category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  }): Observable<LedgerAccount> {
    return this.api.post<LedgerAccount>('/ledger-accounts', payload);
  }

  updateLedgerAccount(
    id: string,
    payload: Partial<LedgerAccount>,
  ): Observable<LedgerAccount> {
    return this.api.patch<LedgerAccount>(`/ledger-accounts/${id}`, payload);
  }

  deleteLedgerAccount(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/ledger-accounts/${id}`);
  }
}

