import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Vendor {
  id: string;
  name: string;
  displayName?: string | null;
  vendorTrn?: string | null;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
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

export interface CreateVendorPayload {
  name: string;
  displayName?: string;
  vendorTrn?: string;
  category?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  preferredCurrency?: string;
  paymentTerms?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class VendorsService {
  constructor(private readonly api: ApiService) {}

  listVendors(filters?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    _refresh?: number; // Cache-busting parameter
  }): Observable<Vendor[]> {
    const params: Record<string, any> = {};
    if (filters?.search) params['search'] = filters.search;
    if (filters?.category) params['category'] = filters.category;
    if (filters?.isActive !== undefined) params['isActive'] = filters.isActive;
    if (filters?._refresh) params['_refresh'] = filters._refresh;
    return this.api.get<Vendor[]>('/vendors', params);
  }

  getVendor(id: string): Observable<Vendor> {
    return this.api.get<Vendor>(`/vendors/${id}`);
  }

  createVendor(payload: CreateVendorPayload): Observable<Vendor> {
    return this.api.post<Vendor>('/vendors', payload);
  }

  updateVendor(id: string, payload: Partial<CreateVendorPayload>): Observable<Vendor> {
    return this.api.patch<Vendor>(`/vendors/${id}`, payload);
  }

  deleteVendor(id: string): Observable<void> {
    return this.api.delete<void>(`/vendors/${id}`);
  }

  searchVendors(query: string): Observable<Vendor[]> {
    return this.api.get<Vendor[]>('/vendors/search', { q: query });
  }

  getTopVendors(limit?: number, startDate?: string, endDate?: string): Observable<any[]> {
    const params: Record<string, any> = {};
    if (limit) params['limit'] = limit;
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    return this.api.get<any[]>('/vendors/top', params);
  }

  getVendorSpend(id: string, startDate?: string, endDate?: string): Observable<any> {
    const params: Record<string, any> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    return this.api.get<any>(`/vendors/${id}/spend`, params);
  }
}

