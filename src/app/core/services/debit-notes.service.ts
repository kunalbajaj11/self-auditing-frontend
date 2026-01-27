import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface DebitNote {
  id: string;
  debitNoteNumber: string;
  invoiceId?: string | null;
  expenseId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerTrn?: string | null;
  // When fetched via /debit-notes/:id the backend also returns related entities.
  // Keep them optional so existing code continues to work, but we can use them
  // to pre-fill forms.
  invoice?: {
    id: string;
    customerId?: string | null;
    customerName?: string | null;
    customerTrn?: string | null;
    currency?: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    customerTrn?: string | null;
  } | null;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorTrn?: string | null;
  vendor?: {
    id: string;
    name: string;
    vendorTrn?: string | null;
  } | null;
  expense?: {
    id: string;
    vendorId?: string | null;
    vendorName?: string | null;
    vendorTrn?: string | null;
    currency?: string | null;
    amount?: string | null;
    vatAmount?: string | null;
    description?: string | null;
  } | null;
  debitNoteDate: string;
  reason: string;
  amount: string;
  vatAmount: string;
  totalAmount: string;
  currency: string;
  status: string;
  appliedAmount: string;
  remainingAmount: string;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDebitNotePayload {
  invoiceId?: string;
  expenseId?: string;
  customerId?: string;
  customerName?: string;
  customerTrn?: string;
  vendorId?: string;
  vendorName?: string;
  vendorTrn?: string;
  debitNoteDate: string;
  reason: string;
  amount: number;
  vatAmount?: number;
  currency?: string;
  description?: string;
  notes?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class DebitNotesService {
  constructor(private readonly api: ApiService) {}

  listDebitNotes(filters?: {
    status?: string;
    customerId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<DebitNote[]> {
    return this.api.get<DebitNote[]>('/debit-notes', filters || {});
  }

  getDebitNote(id: string): Observable<DebitNote> {
    return this.api.get<DebitNote>(`/debit-notes/${id}`);
  }

  createDebitNote(payload: CreateDebitNotePayload): Observable<DebitNote> {
    return this.api.post<DebitNote>('/debit-notes', payload);
  }

  updateDebitNote(id: string, payload: Partial<CreateDebitNotePayload>): Observable<DebitNote> {
    // Backend exposes PUT /debit-notes/:id (PATCH is only for /:id/status),
    // so use PUT here to avoid 404s when editing debit notes.
    return this.api.put<DebitNote>(`/debit-notes/${id}`, payload);
  }

  /**
   * Update ONLY the status of a debit note.
   * Maps to PATCH /debit-notes/:id/status on the backend.
   */
  updateDebitNoteStatus(id: string, status: string): Observable<DebitNote> {
    return this.api.patch<DebitNote>(`/debit-notes/${id}/status`, { status });
  }

  deleteDebitNote(id: string): Observable<void> {
    return this.api.delete<void>(`/debit-notes/${id}`);
  }

  getNextDebitNoteNumber(): Observable<{ debitNoteNumber: string }> {
    return this.api.get<{ debitNoteNumber: string }>('/debit-notes/next-debit-note-number');
  }

  applyDebitNote(debitNoteId: string, invoiceId: string, applyAmount: number): Observable<any> {
    return this.api.post(`/debit-notes/${debitNoteId}/apply`, {
      invoiceId,
      appliedAmount: applyAmount,
    });
  }

  applyDebitNoteToExpense(debitNoteId: string, expenseId: string, applyAmount: number): Observable<any> {
    return this.api.post(`/debit-notes/${debitNoteId}/apply-to-expense`, {
      expenseId,
      appliedAmount: applyAmount,
    });
  }
}

