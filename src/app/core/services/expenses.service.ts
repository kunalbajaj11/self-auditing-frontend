import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  Expense,
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

  createExpense(payload: Partial<Expense> & { type: ExpenseType; expenseTypeId?: string }): Observable<Expense> {
    return this.api
      .post<Expense>('/expenses', payload)
      .pipe(map((item) => this.normalizeExpense(item)));
  }

  updateExpense(id: string, payload: Partial<Expense>): Observable<Expense> {
    return this.api
      .patch<Expense>(`/expenses/${id}`, payload)
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
    // Always use totalAmount from API (correctly calculated for reverse charge)
    // Don't calculate it here as it would be wrong for reverse charge expenses
    const totalAmount = raw.totalAmount !== undefined
      ? Number(raw.totalAmount)
      : amount; // Fallback to amount only (for reverse charge, total = amount)

    // Normalize line items if present
    const lineItems = raw.lineItems?.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      itemName: item.itemName,
      sku: item.sku,
      quantity: Number(item.quantity ?? 0),
      unitOfMeasure: item.unitOfMeasure,
      unitPrice: Number(item.unitPrice ?? 0),
      amount: Number(item.amount ?? 0),
      vatRate: item.vatRate ? Number(item.vatRate) : undefined,
      vatAmount: Number(item.vatAmount ?? 0),
      vatTaxType: item.vatTaxType,
      totalAmount: Number(item.totalAmount ?? 0),
      description: item.description,
      lineNumber: item.lineNumber,
    })) || undefined;

    // Extract expenseTypeId from expenseType relation if present
    const expenseTypeId = raw.expenseType?.id || raw.expenseTypeId || null;

    return {
      ...raw,
      amount,
      vatAmount,
      totalAmount,
      categoryName: raw.category?.name ?? raw.categoryName ?? null,
      expenseTypeId, // Include custom expense type ID
      attachments,
      lineItems,
    };
  }
}
