import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  Expense,
  ExpenseStatus,
  ExpenseType,
  AccrualSummary,
  Attachment,
} from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  constructor(private readonly api: ApiService) {}

  listExpenses(filters?: Record<string, any>): Observable<Expense[]> {
    return this.api
      .get<Expense[]>('/expenses', filters)
      .pipe(map((items) => items.map((item) => this.normalizeExpense(item))));
  }

  getExpense(id: string): Observable<Expense> {
    return this.api
      .get<Expense>(`/expenses/${id}`)
      .pipe(map((item) => this.normalizeExpense(item)));
  }

  createExpense(payload: Partial<Expense> & { type: ExpenseType }): Observable<Expense> {
    return this.api
      .post<Expense>('/expenses', payload)
      .pipe(map((item) => this.normalizeExpense(item)));
  }

  updateExpense(id: string, payload: Partial<Expense>): Observable<Expense> {
    return this.api
      .patch<Expense>(`/expenses/${id}`, payload)
      .pipe(map((item) => this.normalizeExpense(item)));
  }

  updateStatus(id: string, status: ExpenseStatus): Observable<Expense> {
    return this.api
      .patch<Expense>(`/expenses/${id}/status`, { status })
      .pipe(map((item) => this.normalizeExpense(item)));
  }

  linkAccrual(id: string, accrualExpenseId: string): Observable<Expense> {
    return this.api
      .post<Expense>(`/expenses/${id}/link-accrual`, {
        accrualExpenseId,
      })
      .pipe(map((item) => this.normalizeExpense(item)));
  }

  listAccruals(filters?: Record<string, any>): Observable<AccrualSummary[]> {
    return this.api.get<AccrualSummary[]>('/accruals', filters);
  }

  pendingAccrualCount(): Observable<{ pending: number }> {
    return this.api.get<{ pending: number }>('/accruals/summary/pending-count');
  }

  private normalizeExpense(raw: any): Expense {
    const attachments: Attachment[] = (raw.attachments ?? []).map((file: any) => ({
      ...file,
      fileSize: Number(file.fileSize ?? file.size ?? 0),
    }));

    const amount = Number(raw.amount ?? 0);
    const vatAmount = Number(raw.vatAmount ?? 0);
    const totalAmount =
      raw.totalAmount !== undefined
        ? Number(raw.totalAmount)
        : Number((amount + vatAmount).toFixed(2));

    return {
      ...raw,
      amount,
      vatAmount,
      totalAmount,
      categoryName: raw.category?.name ?? raw.categoryName ?? null,
      attachments,
    };
  }
}
