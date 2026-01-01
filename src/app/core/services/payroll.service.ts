import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SalaryProfile {
  id: string;
  userId?: string | null;
  employeeName?: string | null;
  basicSalary: string;
  currency: string;
  effectiveDate: string;
  endDate?: string | null;
  isActive: boolean;
  salaryComponents?: SalaryComponent[];
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryComponent {
  id: string;
  componentType: string;
  name: string;
  amount?: string | null;
  percentage?: string | null;
  hourlyRate?: string | null;
  calculationType: string;
  isTaxable: boolean;
  priority: number;
}

export interface PayrollRun {
  id: string;
  payrollPeriod: string;
  payDate: string;
  status: string;
  totalGrossAmount: string;
  totalDeductions: string;
  totalNetAmount: string;
  currency: string;
  notes?: string | null;
  createdBy?: {
    id: string;
    name: string;
  };
  payrollEntries?: PayrollEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollEntry {
  id: string;
  basicSalary: string;
  allowancesAmount: string;
  deductionsAmount: string;
  overtimeAmount: string;
  bonusAmount: string;
  commissionAmount: string;
  grossSalary: string;
  netSalary: string;
  currency: string;
  payslipGenerated: boolean;
  payslipEmailSent: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateSalaryProfilePayload {
  userId?: string; // Optional - for employees with portal access
  employeeName?: string; // For employees without portal access (required if userId not provided)
  basicSalary: number;
  currency?: string;
  effectiveDate: string;
  endDate?: string;
  salaryComponents?: SalaryComponentPayload[];
}

export interface SalaryComponentPayload {
  componentType: string;
  name: string;
  amount?: number;
  percentage?: number;
  hourlyRate?: number;
  calculationType: string;
  isTaxable?: boolean;
  priority?: number;
}

export interface CreatePayrollRunPayload {
  payrollPeriod: string;
  payDate: string;
  userIds?: string[];
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  constructor(private readonly api: ApiService) {}

  listSalaryProfiles(): Observable<SalaryProfile[]> {
    return this.api.get<SalaryProfile[]>('/payroll/salary-profiles');
  }

  getSalaryProfile(id: string): Observable<SalaryProfile> {
    return this.api.get<SalaryProfile>(`/payroll/salary-profiles/${id}`);
  }

  createSalaryProfile(payload: CreateSalaryProfilePayload): Observable<SalaryProfile> {
    return this.api.post<SalaryProfile>('/payroll/salary-profiles', payload);
  }

  listPayrollRuns(filters?: {
    status?: string;
    payrollPeriod?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<PayrollRun[]> {
    return this.api.get<PayrollRun[]>('/payroll/runs', filters);
  }

  getPayrollRun(id: string): Observable<PayrollRun> {
    return this.api.get<PayrollRun>(`/payroll/runs/${id}`);
  }

  createPayrollRun(payload: CreatePayrollRunPayload): Observable<PayrollRun> {
    return this.api.post<PayrollRun>('/payroll/runs', payload);
  }

  updateSalaryProfile(id: string, payload: CreateSalaryProfilePayload): Observable<SalaryProfile> {
    return this.api.put<SalaryProfile>(`/payroll/salary-profiles/${id}`, payload);
  }

  updatePayrollRun(id: string, payload: CreatePayrollRunPayload): Observable<PayrollRun> {
    return this.api.put<PayrollRun>(`/payroll/runs/${id}`, payload);
  }

  processPayrollRun(id: string, userIds?: string[]): Observable<PayrollRun> {
    return this.api.post<PayrollRun>(`/payroll/runs/${id}/process`, { userIds });
  }

  cancelPayrollRun(id: string): Observable<PayrollRun> {
    return this.api.post<PayrollRun>(`/payroll/runs/${id}/cancel`, {});
  }

  getPayrollEntry(id: string): Observable<PayrollEntry> {
    return this.api.get<PayrollEntry>(`/payroll/entries/${id}`);
  }

  generatePayslip(entryId: string): Observable<Blob> {
    return this.api.postDownload(`/payroll/entries/${entryId}/payslip`, {});
  }

  sendPayslipEmail(entryId: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>(`/payroll/entries/${entryId}/payslip/send-email`, {});
  }

  sendBulkPayslipEmails(runId: string): Observable<{
    total: number;
    sent: number;
    failed: number;
    errors: Array<{ entryId: string; error: string }>;
  }> {
    return this.api.post<{
      total: number;
      sent: number;
      failed: number;
      errors: Array<{ entryId: string; error: string }>;
    }>(`/payroll/runs/${runId}/send-payslip-emails`, {});
  }

  getPayrollSummaryReport(filters?: {
    startDate?: string;
    endDate?: string;
    payrollPeriod?: string;
    status?: string;
  }): Observable<{
    summary: {
      totalRuns: number;
      totalGrossAmount: number;
      totalDeductions: number;
      totalNetAmount: number;
      averageNetPerEmployee: number;
      employeeCount: number;
    };
    runs: PayrollRun[];
    periodBreakdown: Array<{
      period: string;
      grossAmount: number;
      deductionsAmount: number;
      netAmount: number;
      employeeCount: number;
    }>;
  }> {
    return this.api.get('/payroll/reports/summary', filters);
  }

  getEmployeePayrollHistory(userId: string, filters?: {
    startDate?: string;
    endDate?: string;
    payrollPeriod?: string;
  }): Observable<{
    employee: {
      id: string;
      name: string;
      email: string;
    };
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    entries: Array<{
      id: string;
      payrollPeriod: string;
      payDate: string;
      basicSalary: number;
      allowancesAmount: number;
      deductionsAmount: number;
      overtimeAmount: number;
      bonusAmount: number;
      commissionAmount: number;
      grossSalary: number;
      netSalary: number;
      currency: string;
    }>;
  }> {
    return this.api.get(`/payroll/reports/employee/${userId}`, filters);
  }
}

