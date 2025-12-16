import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ExpensePayment {
  id: string;
  expenseId: string;
  expense?: {
    id: string;
    vendorName?: string;
    vendorTrn?: string;
    amount: string;
    vatAmount: string;
    totalAmount: string;
    currency: string;
    expenseDate: string;
    description?: string;
  };
  paymentDate: string;
  amount: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePaymentPayload {
  expenseId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpensePaymentsService {
  constructor(private readonly api: ApiService) {}

  listPayments(): Observable<ExpensePayment[]> {
    return this.api.get<ExpensePayment[]>('/expense-payments');
  }

  getPaymentsByExpense(expenseId: string): Observable<ExpensePayment[]> {
    return this.api.get<ExpensePayment[]>(`/expense-payments/expense/${expenseId}`);
  }

  getPayment(id: string): Observable<ExpensePayment> {
    return this.api.get<ExpensePayment>(`/expense-payments/${id}`);
  }

  createPayment(payload: CreateExpensePaymentPayload): Observable<ExpensePayment> {
    return this.api.post<ExpensePayment>('/expense-payments', payload);
  }

  deletePayment(id: string): Observable<void> {
    return this.api.delete<void>(`/expense-payments/${id}`);
  }
}

