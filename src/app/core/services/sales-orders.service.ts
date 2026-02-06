import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Customer } from './customers.service';

export interface SalesOrderLineItem {
  id?: string;
  productId?: string;
  itemName: string;
  sku?: string;
  description?: string;
  orderedQuantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  vatRate?: number;
  vatTaxType?: string;
  amount?: number;
  vatAmount?: number;
  totalAmount?: number;
  lineNumber?: number;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  customerTrn?: string | null;
  customer?: Customer | null;
  organization?: any | null;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  totalAmount: string;
  currency: string;
  notes?: string | null;
  sentDate?: string | null;
  sentToEmail?: string | null;
  lineItems?: SalesOrderLineItem[];
  deliveryChallans?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesOrderPayload {
  customerId?: string;
  customerName?: string;
  customerTrn?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status?: string;
  currency?: string;
  notes?: string;
  lineItems: SalesOrderLineItem[];
}

export interface UpdateSalesOrderPayload extends Partial<CreateSalesOrderPayload> {
  lineItems?: SalesOrderLineItem[];
}

@Injectable({ providedIn: 'root' })
export class SalesOrdersService {
  constructor(private readonly api: ApiService) {}

  listSalesOrders(filters?: {
    status?: string;
    customerId?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
    soNumber?: string;
  }): Observable<SalesOrder[]> {
    return this.api.get<SalesOrder[]>('/sales-orders', filters || {});
  }

  getSalesOrder(id: string): Observable<SalesOrder> {
    return this.api.get<SalesOrder>(`/sales-orders/${id}`);
  }

  getNextSONumber(): Observable<{ soNumber: string }> {
    return this.api.get<{ soNumber: string }>('/sales-orders/next-so-number');
  }

  createSalesOrder(payload: CreateSalesOrderPayload): Observable<SalesOrder> {
    return this.api.post<SalesOrder>('/sales-orders', payload);
  }

  updateSalesOrder(id: string, payload: UpdateSalesOrderPayload): Observable<SalesOrder> {
    return this.api.put<SalesOrder>(`/sales-orders/${id}`, payload);
  }

  deleteSalesOrder(id: string): Observable<void> {
    return this.api.delete<void>(`/sales-orders/${id}`);
  }

  updateStatus(id: string, status: string): Observable<SalesOrder> {
    return this.api.patch<SalesOrder>(`/sales-orders/${id}/status`, { status });
  }

  sendToCustomer(id: string, email?: string): Observable<SalesOrder> {
    return this.api.post<SalesOrder>(`/sales-orders/${id}/send`, { email });
  }

  downloadSOPDF(id: string): Observable<Blob> {
    return this.api.download(`/sales-orders/${id}/pdf`);
  }

  sendSalesOrderEmail(id: string, emailData: {
    recipientEmail: string;
    subject?: string;
    message?: string;
  }): Observable<any> {
    return this.api.post<any>(`/sales-orders/${id}/send-email`, emailData);
  }
}

