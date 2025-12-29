import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Expense } from '../models/expense.model';

export interface PaymentAllocationResponse {
  id: string;
  expenseId: string;
  expense?: Expense;
  allocatedAmount: string;
}

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
  allocations?: PaymentAllocationResponse[]; // Allocations for multi-invoice payments
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  expenseId: string;
  allocatedAmount: number;
}

export interface CreateExpensePaymentPayload {
  expenseId?: string; // Optional for backward compatibility
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  allocations?: PaymentAllocation[]; // New: invoice-wise allocations
  vendorName?: string; // Optional: for filtering
}

export interface ExpenseWithOutstanding extends Expense {
  outstandingAmount: number;
  totalAmount: number;
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

  getPendingInvoicesByVendor(vendorName: string): Observable<ExpenseWithOutstanding[]> {
    return this.api.get<ExpenseWithOutstanding[]>(
      `/expense-payments/pending-invoices/${encodeURIComponent(vendorName)}`
    );
  }
}

