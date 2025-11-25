import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Category {
  id: string;
  name: string;
  description?: string;
  isSystemDefault: boolean;
  expenseType?: string | null; // For system expense types
  expenseTypeId?: string | null; // For custom expense types
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private readonly api: ApiService) {}

  listCategories(expenseType?: string): Observable<Category[]> {
    const params = expenseType ? { expenseType } : {};
    return this.api.get<Category[]>('/categories', params);
  }

  createCategory(payload: { 
    name: string; 
    description?: string | null;
    expenseType?: string | null;
    expenseTypeId?: string | null;
  }): Observable<Category> {
    return this.api.post<Category>('/categories', payload);
  }

  updateCategory(id: string, payload: Partial<Category>): Observable<Category> {
    return this.api.patch<Category>(`/categories/${id}`, payload);
  }

  deleteCategory(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/categories/${id}`);
  }
}
