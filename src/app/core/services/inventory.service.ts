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

export enum StockMovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  RETURN = 'return',
}

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  movementType: StockMovementType;
  quantity: string;
  unitCost: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
  location?: InventoryLocation;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockMovementPayload {
  productId: string;
  locationId: string;
  movementType: StockMovementType;
  quantity: number;
  unitCost: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export interface StockMovementFilters {
  productId?: string;
  locationId?: string;
  movementType?: StockMovementType;
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

  updateLocation(id: string, payload: CreateLocationPayload): Observable<InventoryLocation> {
    return this.api.patch<InventoryLocation>(`/inventory/locations/${id}`, payload);
  }

  getStockQuantity(productId: string, locationId?: string): Observable<StockInfo> {
    const params = locationId ? { locationId } : undefined;
    return this.api.get<StockInfo>(`/inventory/products/${productId}/stock`, params);
  }

  listStockMovements(filters?: StockMovementFilters): Observable<StockMovement[]> {
    return this.api.get<StockMovement[]>('/inventory/movements', filters);
  }

  createStockMovement(payload: CreateStockMovementPayload): Observable<StockMovement> {
    return this.api.post<StockMovement>('/inventory/movements', payload);
  }
}

