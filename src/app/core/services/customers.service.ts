import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Customer {
  id: string;
  name: string;
  displayName?: string | null;
  customerTrn?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  preferredCurrency: string;
  paymentTerms?: number | null;
  isActive: boolean;
  notes?: string | null;
  firstUsedAt?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  displayName?: string;
  customerTrn?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  preferredCurrency?: string;
  paymentTerms?: number;
  isActive?: boolean;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  constructor(private readonly api: ApiService) {}

  listCustomers(search?: string, isActive?: boolean): Observable<Customer[]> {
    const params: Record<string, any> = {};
    if (search) params['search'] = search;
    if (isActive !== undefined) params['isActive'] = isActive;
    return this.api.get<Customer[]>('/customers', params);
  }

  getCustomer(id: string): Observable<Customer> {
    return this.api.get<Customer>(`/customers/${id}`);
  }

  createCustomer(payload: CreateCustomerPayload): Observable<Customer> {
    return this.api.post<Customer>('/customers', payload);
  }

  updateCustomer(id: string, payload: Partial<CreateCustomerPayload>): Observable<Customer> {
    return this.api.patch<Customer>(`/customers/${id}`, payload);
  }

  deleteCustomer(id: string): Observable<void> {
    return this.api.delete<void>(`/customers/${id}`);
  }
}

