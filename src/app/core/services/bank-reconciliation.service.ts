import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ReconciliationRecord,
  BankTransaction,
  SystemTransaction,
  MatchTransactionsRequest,
  ManualEntryRequest,
} from '../models/reconciliation.model';

@Injectable({ providedIn: 'root' })
export class BankReconciliationService {
  constructor(private readonly api: ApiService) {}

  uploadStatement(
    file: File,
    statementPeriodStart?: string,
    statementPeriodEnd?: string,
  ): Observable<ReconciliationRecord> {
    const additionalData: Record<string, any> = {};
    if (statementPeriodStart) {
      additionalData['statementPeriodStart'] = statementPeriodStart;
    }
    if (statementPeriodEnd) {
      additionalData['statementPeriodEnd'] = statementPeriodEnd;
    }

    return this.api.uploadFile('/bank-reconciliation/upload', file, additionalData);
  }

  listReconciliations(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Observable<ReconciliationRecord[]> {
    return this.api.get<ReconciliationRecord[]>('/bank-reconciliation', filters);
  }

  getReconciliationDetail(id: string): Observable<ReconciliationRecord> {
    return this.api.get<ReconciliationRecord>(`/bank-reconciliation/${id}`);
  }

  matchTransactions(request: MatchTransactionsRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/bank-reconciliation/match', request);
  }

  createManualEntry(request: ManualEntryRequest): Observable<SystemTransaction> {
    return this.api.post<SystemTransaction>('/bank-reconciliation/manual-entry', request);
  }

  downloadPDFReport(id: string): Observable<Blob> {
    return this.api.download(`/bank-reconciliation/report/${id}/pdf`);
  }

  downloadExcelReport(id: string): Observable<Blob> {
    return this.api.download(`/bank-reconciliation/report/${id}/excel`);
  }
}

