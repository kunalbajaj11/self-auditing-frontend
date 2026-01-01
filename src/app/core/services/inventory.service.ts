import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface InventoryLocation {
  id: string;
  name: string;
  address?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockInfo {
  product: any;
  quantity: string;
  location?: InventoryLocation;
}

export interface CreateLocationPayload {
  name: string;
  address?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private readonly api: ApiService) {}

  listLocations(): Observable<InventoryLocation[]> {
    return this.api.get<InventoryLocation[]>('/inventory/locations');
  }

  getLocation(id: string): Observable<InventoryLocation> {
    return this.api.get<InventoryLocation>(`/inventory/locations/${id}`);
  }

  createLocation(payload: CreateLocationPayload): Observable<InventoryLocation> {
    return this.api.post<InventoryLocation>('/inventory/locations', payload);
  }

  getStockQuantity(productId: string, locationId?: string): Observable<StockInfo> {
    const params = locationId ? { locationId } : undefined;
    return this.api.get<StockInfo>(`/inventory/products/${productId}/stock`, params);
  }
}

