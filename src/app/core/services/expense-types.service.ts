import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ExpenseType {
  id: string;
  name: string;
  description?: string;
  displayLabel?: string;
  isSystemDefault: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExpenseTypesService {
  constructor(private readonly api: ApiService) {}

  listExpenseTypes(): Observable<ExpenseType[]> {
    return this.api.get<ExpenseType[]>('/expense-types');
  }

  createExpenseType(payload: {
    name: string;
    description?: string;
    displayLabel?: string;
  }): Observable<ExpenseType> {
    return this.api.post<ExpenseType>('/expense-types', payload);
  }

  updateExpenseType(
    id: string,
    payload: Partial<ExpenseType>,
  ): Observable<ExpenseType> {
    return this.api.patch<ExpenseType>(`/expense-types/${id}`, payload);
  }

  deleteExpenseType(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/expense-types/${id}`);
  }
}

