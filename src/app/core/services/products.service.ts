import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  unitPrice?: string | null;
  unitOfMeasure?: string | null;
  vatRate: string;
  isActive: boolean;
  stockQuantity: string;
  reorderLevel?: string | null;
  reorderQuantity?: string | null;
  costPrice?: string | null;
  averageCost?: string | null;
  valuationMethod: string;
  category?: string | null;
  barcode?: string | null;
  locationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  sku?: string;
  description?: string;
  unitPrice?: number;
  unitOfMeasure?: string;
  vatRate?: number;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  isActive?: boolean;
  stockQuantity?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  category?: string;
  barcode?: string;
  locationId?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(private readonly api: ApiService) {}

  listProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('/products');
  }

  getProduct(id: string): Observable<Product> {
    return this.api.get<Product>(`/products/${id}`);
  }

  createProduct(payload: CreateProductPayload): Observable<Product> {
    return this.api.post<Product>('/products', payload);
  }

  updateProduct(id: string, payload: UpdateProductPayload): Observable<Product> {
    return this.api.put<Product>(`/products/${id}`, payload);
  }

  deleteProduct(id: string): Observable<void> {
    return this.api.delete<void>(`/products/${id}`);
  }
}

