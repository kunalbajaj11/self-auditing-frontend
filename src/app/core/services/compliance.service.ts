import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ComplianceDeadline,
  ComplianceType,
  ComplianceSummary,
  CreateDeadlineRequest,
  GenerateDeadlinesRequest,
  DeadlineStatus,
} from '../models/compliance.model';

@Injectable({
  providedIn: 'root',
})
export class ComplianceService {
  private get baseUrl(): string {
    return `${this.apiService['baseUrl']}/compliance`;
  }

  constructor(
    private readonly http: HttpClient,
    private readonly apiService: ApiService,
  ) {}

  getDeadlines(
    startDate?: string,
    endDate?: string,
    complianceType?: ComplianceType,
  ): Observable<ComplianceDeadline[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (complianceType) {
      params = params.set('complianceType', complianceType);
    }
    return this.http.get<ComplianceDeadline[]>(`${this.baseUrl}/deadlines`, {
      params,
    });
  }

  getUpcomingDeadlines(days: number = 30): Observable<ComplianceDeadline[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ComplianceDeadline[]>(
      `${this.baseUrl}/deadlines/upcoming`,
      { params },
    );
  }

  getOverdueDeadlines(): Observable<ComplianceDeadline[]> {
    return this.http.get<ComplianceDeadline[]>(
      `${this.baseUrl}/deadlines/overdue`,
    );
  }

  createDeadline(request: CreateDeadlineRequest): Observable<ComplianceDeadline> {
    return this.http.post<ComplianceDeadline>(
      `${this.baseUrl}/deadlines`,
      request,
    );
  }

  generateDeadlines(
    request: GenerateDeadlinesRequest,
  ): Observable<ComplianceDeadline[]> {
    return this.http.post<ComplianceDeadline[]>(
      `${this.baseUrl}/deadlines/generate`,
      request,
    );
  }

  updateDeadlineStatus(
    id: string,
    status: DeadlineStatus,
    filingReference?: string,
  ): Observable<ComplianceDeadline> {
    return this.http.patch<ComplianceDeadline>(
      `${this.baseUrl}/deadlines/${id}/status`,
      { status, filingReference },
    );
  }

  getComplianceSummary(
    startDate?: string,
    endDate?: string,
  ): Observable<ComplianceSummary> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    return this.http.get<ComplianceSummary>(`${this.baseUrl}/summary`, {
      params,
    });
  }

  getComplianceCalendar(
    year: number,
    month?: number,
  ): Observable<ComplianceDeadline[]> {
    let params = new HttpParams().set('year', year.toString());
    if (month) {
      params = params.set('month', month.toString());
    }
    return this.http.get<ComplianceDeadline[]>(`${this.baseUrl}/calendar`, {
      params,
    });
  }

  getPaymentTracking(
    startDate?: string,
    endDate?: string,
  ): Observable<any> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    return this.http.get<any>(`${this.baseUrl}/payment-tracking`, { params });
  }

  sendReminders(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/reminders/send`,
      {},
    );
  }
}

