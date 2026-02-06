import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Customer } from './customers.service';
import { SalesOrder } from './sales-orders.service';

export interface DeliveryChallanLineItem {
  id?: string;
  productId?: string;
  itemName: string;
  description?: string;
  quantity: number;
  unitOfMeasure?: string;
  lineNumber?: number;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  challanDate: string;
  status: string;
  salesOrderId?: string | null;
  salesOrder?: SalesOrder | null;
  customerId?: string | null;
  customerName?: string | null;
  customerTrn?: string | null;
  customer?: Customer | null;
  deliveryAddress?: string | null;
  vehicleNumber?: string | null;
  transportMode?: string | null;
  lrNumber?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  lineItems?: DeliveryChallanLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryChallanPayload {
  salesOrderId?: string;
  customerId?: string;
  customerName?: string;
  customerTrn?: string;
  challanDate: string;
  status?: string;
  deliveryAddress?: string;
  vehicleNumber?: string;
  transportMode?: string;
  lrNumber?: string;
  notes?: string;
  lineItems?: DeliveryChallanLineItem[];
}

export interface UpdateDeliveryChallanPayload extends Partial<CreateDeliveryChallanPayload> {
  lineItems?: DeliveryChallanLineItem[];
}

@Injectable({ providedIn: 'root' })
export class DeliveryChallansService {
  constructor(private readonly api: ApiService) {}

  listDeliveryChallans(filters?: {
    status?: string;
    customerId?: string;
    salesOrderId?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
    challanNumber?: string;
  }): Observable<DeliveryChallan[]> {
    return this.api.get<DeliveryChallan[]>('/delivery-challans', filters || {});
  }

  getDeliveryChallan(id: string): Observable<DeliveryChallan> {
    return this.api.get<DeliveryChallan>(`/delivery-challans/${id}`);
  }

  getNextChallanNumber(): Observable<{ challanNumber: string }> {
    return this.api.get<{ challanNumber: string }>(
      '/delivery-challans/next-challan-number',
    );
  }

  createDeliveryChallan(payload: CreateDeliveryChallanPayload): Observable<DeliveryChallan> {
    return this.api.post<DeliveryChallan>('/delivery-challans', payload);
  }

  createFromSalesOrder(
    salesOrderId: string,
    payload: {
      challanDate: string;
      notes?: string;
      deliveryAddress?: string;
      vehicleNumber?: string;
      transportMode?: string;
      lrNumber?: string;
      lineItems?: Array<{ salesOrderLineItemId?: string; quantity: number }>;
    },
  ): Observable<DeliveryChallan> {
    return this.api.post<DeliveryChallan>(
      `/delivery-challans/from-sales-order/${salesOrderId}`,
      payload,
    );
  }

  updateDeliveryChallan(id: string, payload: UpdateDeliveryChallanPayload): Observable<DeliveryChallan> {
    return this.api.put<DeliveryChallan>(`/delivery-challans/${id}`, payload);
  }

  deleteDeliveryChallan(id: string): Observable<void> {
    return this.api.delete<void>(`/delivery-challans/${id}`);
  }

  updateStatus(id: string, status: string): Observable<DeliveryChallan> {
    return this.api.patch<DeliveryChallan>(`/delivery-challans/${id}/status`, { status });
  }

  downloadDCPDF(id: string): Observable<Blob> {
    return this.api.download(`/delivery-challans/${id}/pdf`);
  }

  sendDeliveryChallanEmail(id: string, emailData: {
    recipientEmail: string;
    subject?: string;
    message?: string;
  }): Observable<any> {
    return this.api.post<any>(`/delivery-challans/${id}/send-email`, emailData);
  }
}

