import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ReportHistoryItem, GeneratedReport, ReportType } from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly api: ApiService) {}

  listHistory(filters?: { type?: ReportType }): Observable<ReportHistoryItem[]> {
    return this.api.get<ReportHistoryItem[]>('/reports/history', filters);
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
}
