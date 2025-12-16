import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export enum JournalEntryType {
  SHARE_CAPITAL = 'share_capital',
  RETAINED_EARNINGS = 'retained_earnings',
  SHAREHOLDER_ACCOUNT = 'shareholder_account',
}

export enum JournalEntryCategory {
  EQUITY = 'equity',
  OTHERS = 'others',
}

export enum JournalEntryStatus {
  CASH_PAID = 'cash_paid',
  BANK_PAID = 'bank_paid',
  CASH_RECEIVED = 'cash_received',
  BANK_RECEIVED = 'bank_received',
}

export interface JournalEntry {
  id: string;
  type: JournalEntryType;
  category: JournalEntryCategory;
  status: JournalEntryStatus;
  amount: number;
  entryDate: string;
  description?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateJournalEntryPayload {
  type: JournalEntryType;
  category: JournalEntryCategory;
  status: JournalEntryStatus;
  amount: number;
  entryDate: string;
  description?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateJournalEntryPayload {
  type?: JournalEntryType;
  category?: JournalEntryCategory;
  status?: JournalEntryStatus;
  amount?: number;
  entryDate?: string;
  description?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface JournalEntryFilters {
  type?: JournalEntryType;
  category?: JournalEntryCategory;
  status?: JournalEntryStatus;
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: 'root' })
export class JournalEntriesService {
  constructor(private readonly api: ApiService) {}

  listEntries(filters?: JournalEntryFilters): Observable<JournalEntry[]> {
    return this.api.get<JournalEntry[]>('/journal-entries', filters);
  }

  getEntry(id: string): Observable<JournalEntry> {
    return this.api.get<JournalEntry>(`/journal-entries/${id}`);
  }

  createEntry(payload: CreateJournalEntryPayload): Observable<JournalEntry> {
    return this.api.post<JournalEntry>('/journal-entries', payload);
  }

  updateEntry(id: string, payload: UpdateJournalEntryPayload): Observable<JournalEntry> {
    return this.api.patch<JournalEntry>(`/journal-entries/${id}`, payload);
  }

  deleteEntry(id: string): Observable<void> {
    return this.api.delete<void>(`/journal-entries/${id}`);
  }
}

