import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ReportHistoryItem, ReportHistoryPage, GeneratedReport, ReportType } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly api: ApiService) {}

  listHistory(filters?: { type?: ReportType; page?: number; limit?: number }): Observable<ReportHistoryPage> {
    return this.api.get<ReportHistoryPage>('/reports/history', filters);
  }

  deleteReport(id: string): Observable<{ success: boolean; message: string }> {
    return this.api.delete<{ success: boolean; message: string }>(`/reports/${id}`);
  }

  generateReport(payload: {
    type: ReportType;
    filters?: Record<string, any>;
    format?: 'json' | 'csv' | 'xlsx' | 'pdf';
  }): Observable<GeneratedReport> {
    return this.api.post<GeneratedReport>('/reports/generate', payload);
  }

  getFilterOptions(): Observable<{ vendors: string[]; customers: string[] }> {
    return this.api.get<{ vendors: string[]; customers: string[] }>('/reports/filter-options');
  }

  getDashboardSummary(filters?: { startDate?: string; endDate?: string }): Observable<{
    profitAndLoss: {
      revenue: { netAmount: number; netVat: number };
      expenses: { total: number; vat: number };
      summary: { netProfit: number };
    };
    payables: {
      summary: {
        totalAmount: number;
        pendingItems: number;
        paidItems: number;
      };
    };
    receivables: {
      summary: {
        totalOutstanding: number;
        unpaidInvoices: number;
        partialInvoices: number;
        overdueInvoices: number;
      };
    };
      cashBalance: number;
      bankBalance: number;
      outputVat: number;
      inputVat: number;
      /** Net VAT Payable for period (matches account entries for VAT Payable). */
      vatPayableNet?: number;
  }> {
    return this.api.get<{
      profitAndLoss: {
        revenue: { netAmount: number; netVat: number };
        expenses: { total: number; vat: number };
        summary: { netProfit: number };
      };
      payables: {
        summary: {
          totalAmount: number;
          pendingItems: number;
          paidItems: number;
        };
      };
      receivables: {
        summary: {
          totalOutstanding: number;
          unpaidInvoices: number;
          partialInvoices: number;
          overdueInvoices: number;
        };
      };
      cashBalance: number;
      bankBalance: number;
      outputVat: number;
      inputVat: number;
      vatPayableNet?: number;
    }>('/reports/dashboard-summary', filters);
  }

  scheduleReport(payload: {
    type: ReportType;
    filters?: Record<string, any>;
    format?: 'pdf' | 'xlsx' | 'csv';
    recipientEmail?: string;
    schedule?: 'daily' | 'weekly' | 'monthly';
    nextRun?: string;
  }): Observable<any> {
    return this.api.post<any>('/reports/schedule', payload);
  }

  getAccountEntries(params: {
    accountName: string;
    accountType: string;
    startDate?: string;
    endDate?: string;
  }): Observable<{
    accountName: string;
    accountType: string;
    period: { startDate: string; endDate: string };
    entries: Array<{
      id: string;
      type: string;
      date: string;
      referenceNumber?: string;
      description?: string;
      debitAmount: number;
      creditAmount: number;
      amount: number;
      currency?: string;
      status?: string;
      entityId?: string;
      entityType?: string;
    }>;
    totalEntries: number;
    totalDebit: number;
    totalCredit: number;
  }> {
    return this.api.get<{
      accountName: string;
      accountType: string;
      period: { startDate: string; endDate: string };
      entries: Array<{
        id: string;
        type: string;
        date: string;
        referenceNumber?: string;
        description?: string;
        debitAmount: number;
        creditAmount: number;
        amount: number;
        currency?: string;
        status?: string;
        entityId?: string;
        entityType?: string;
      }>;
      totalEntries: number;
      totalDebit: number;
      totalCredit: number;
    }>('/reports/account-entries', params);
  }
}
