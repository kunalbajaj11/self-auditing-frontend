import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CreditNoteLineItem {
  id?: string;
  itemName: string;
  quantity: number | string;
  unitPrice: number | string;
  vatRate?: number | string;
  amount: number | string;
  vatAmount: number | string;
  lineNumber?: number;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  invoiceId?: string | null;
  customerId?: string | null;
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
  lineItems?: CreditNoteLineItem[];
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
  lineItems?: CreditNoteLineItem[];
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

  downloadCreditNotePDF(id: string): Observable<Blob> {
    return this.api.download(`/credit-notes/${id}/pdf`);
  }

  createCreditNote(payload: CreateCreditNotePayload): Observable<CreditNote> {
    return this.api.post<CreditNote>('/credit-notes', payload);
  }

  updateCreditNote(id: string, payload: Partial<CreateCreditNotePayload>): Observable<CreditNote> {
    // Backend exposes PUT /credit-notes/:id (PATCH is only for /:id/status),
    // so use PUT here to avoid 404s when editing credit notes.
    return this.api.put<CreditNote>(`/credit-notes/${id}`, payload);
  }

  /**
   * Update ONLY the status of a credit note.
   * Maps to PATCH /credit-notes/:id/status on the backend.
   */
  updateCreditNoteStatus(id: string, status: string): Observable<CreditNote> {
    return this.api.patch<CreditNote>(`/credit-notes/${id}/status`, { status });
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
      // Backend DTO expects "appliedAmount"
      appliedAmount: applyAmount,
    });
  }
}
