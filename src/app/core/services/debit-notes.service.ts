import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface DebitNote {
  id: string;
  debitNoteNumber: string;
  invoiceId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerTrn?: string | null;
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
  customerId?: string;
  customerName?: string;
  customerTrn?: string;
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
    return this.api.patch<DebitNote>(`/debit-notes/${id}`, payload);
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
}

