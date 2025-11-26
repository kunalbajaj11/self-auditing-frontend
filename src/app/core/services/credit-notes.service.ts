import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerTrn?: string | null;
  creditNoteDate: string;
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

export interface CreateCreditNotePayload {
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  customerTrn?: string;
  creditNoteDate: string;
  reason: string;
  amount: number;
  vatAmount?: number;
  currency?: string;
  description?: string;
  notes?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class CreditNotesService {
  constructor(private readonly api: ApiService) {}

  listCreditNotes(filters?: {
    status?: string;
    customerId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<CreditNote[]> {
    return this.api.get<CreditNote[]>('/credit-notes', filters || {});
  }

  getCreditNote(id: string): Observable<CreditNote> {
    return this.api.get<CreditNote>(`/credit-notes/${id}`);
  }

  createCreditNote(payload: CreateCreditNotePayload): Observable<CreditNote> {
    return this.api.post<CreditNote>('/credit-notes', payload);
  }

  updateCreditNote(id: string, payload: Partial<CreateCreditNotePayload>): Observable<CreditNote> {
    return this.api.patch<CreditNote>(`/credit-notes/${id}`, payload);
  }

  deleteCreditNote(id: string): Observable<void> {
    return this.api.delete<void>(`/credit-notes/${id}`);
  }

  getNextCreditNoteNumber(): Observable<{ creditNoteNumber: string }> {
    return this.api.get<{ creditNoteNumber: string }>('/credit-notes/next-credit-note-number');
  }

  applyCreditNote(creditNoteId: string, invoiceId: string, applyAmount: number): Observable<any> {
    return this.api.post(`/credit-notes/${creditNoteId}/apply`, {
      invoiceId,
      applyAmount,
    });
  }
}
