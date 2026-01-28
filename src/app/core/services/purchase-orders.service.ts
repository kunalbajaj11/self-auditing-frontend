import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface PurchaseOrderLineItem {
  id?: string;
  productId?: string;
  itemName: string;
  sku?: string;
  orderedQuantity: number;
  receivedQuantity?: number;
  unitOfMeasure?: string;
  unitPrice: number;
  vatRate?: number;
  vatTaxType?: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  description?: string;
  lineNumber?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorTrn?: string | null;
  vendor?: any | null;
  poDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  totalAmount: string;
  currency: string;
  notes?: string | null;
  sentDate?: string | null;
  sentToEmail?: string | null;
  lineItems?: PurchaseOrderLineItem[];
  linkedExpenses?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderPayload {
  vendorId?: string;
  vendorName?: string;
  vendorTrn?: string;
  poDate: string;
  expectedDeliveryDate?: string;
  status?: string;
  currency?: string;
  notes?: string;
  lineItems: PurchaseOrderLineItem[];
}

export interface UpdatePurchaseOrderPayload {
  vendorId?: string;
  vendorName?: string;
  vendorTrn?: string;
  poDate?: string;
  expectedDeliveryDate?: string;
  status?: string;
  currency?: string;
  notes?: string;
  lineItems?: PurchaseOrderLineItem[];
}

export interface ReceiveItemPayload {
  lineItemId: string;
  receivedQuantity: number;
}

export interface ReceiveItemsPayload {
  items: ReceiveItemPayload[];
}

export interface ConvertToExpensePayload {
  expenseDate: string;
  expectedPaymentDate?: string;
  invoiceNumber?: string;
  description?: string;
  lineItems: Array<{
    poLineItemId: string;
    quantity: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  constructor(private readonly api: ApiService) {}

  listPurchaseOrders(filters?: {
    status?: string;
    vendorId?: string;
    vendorName?: string;
    startDate?: string;
    endDate?: string;
    poNumber?: string;
  }): Observable<PurchaseOrder[]> {
    return this.api.get<PurchaseOrder[]>('/purchase-orders', filters || {});
  }

  getPurchaseOrder(id: string): Observable<PurchaseOrder> {
    return this.api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  }

  getNextPONumber(): Observable<{ poNumber: string }> {
    return this.api.get<{ poNumber: string }>('/purchase-orders/next-po-number');
  }

  createPurchaseOrder(payload: CreatePurchaseOrderPayload): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>('/purchase-orders', payload);
  }

  updatePurchaseOrder(id: string, payload: UpdatePurchaseOrderPayload): Observable<PurchaseOrder> {
    return this.api.put<PurchaseOrder>(`/purchase-orders/${id}`, payload);
  }

  deletePurchaseOrder(id: string): Observable<void> {
    return this.api.delete<void>(`/purchase-orders/${id}`);
  }

  updateStatus(id: string, status: string): Observable<PurchaseOrder> {
    return this.api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
  }

  sendToVendor(id: string, email?: string): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(`/purchase-orders/${id}/send`, { email });
  }

  receiveItems(id: string, payload: ReceiveItemsPayload): Observable<PurchaseOrder> {
    return this.api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, payload);
  }

  convertToExpense(id: string, payload: ConvertToExpensePayload): Observable<any> {
    return this.api.post<any>(`/purchase-orders/${id}/convert-to-expense`, payload);
  }

  downloadPOPDF(id: string): Observable<Blob> {
    return this.api.download(`/purchase-orders/${id}/pdf`);
  }

  sendPOEmail(id: string, emailData: {
    recipientEmail: string;
    subject?: string;
    message?: string;
  }): Observable<any> {
    return this.api.post<any>(`/purchase-orders/${id}/send-email`, emailData);
  }
}
