import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Customer } from './customers.service';

export interface InvoiceLineItem {
  id?: string;
  productId?: string;
  itemName: string;
  description?: string;
  notes?: string;
  quantity: number;
  unitPrice: number;
  unitOfMeasure?: string;
  vatRate?: number;
  vatTaxType?: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  accountId?: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  invoice?: SalesInvoice;
  paymentDate: string;
  amount: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  customerTrn?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  // When fetched via /sales-invoices/:id the backend also returns related entities.
  // Keep them optional so existing code continues to work, but we can use them
  // to pre-fill forms.
  customer?: Customer | null;
  invoiceDate: string;
  supplyDate?: string | null;
  dueDate?: string | null;
  discountAmount?: string | null;
  amount: string;
  vatAmount: string;
  totalAmount: string;
  currency: string;
  status: string;
  paymentStatus: string;
  paidAmount: string;
  paidDate?: string | null;
  description?: string | null;
  notes?: string | null;
  // Commercial header fields
  deliveryNote?: string | null;
  suppliersRef?: string | null;
  otherReference?: string | null;
  buyerOrderNo?: string | null;
  buyerOrderDate?: string | null;
  despatchedThrough?: string | null;
  destination?: string | null;
  termsOfDelivery?: string | null;
  lineItems?: InvoiceLineItem[];
  displayOptions?: Record<string, unknown> | null;
  invoiceHash?: {
    id?: string;
    hash: string;
    generatedAt: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesInvoicePayload {
  customerId?: string;
  customerName?: string;
  customerTrn?: string;
  customerAddress?: string;
  customerPhone?: string;
  invoiceDate: string;
  dueDate?: string;
  amount?: number;
  vatAmount?: number;
  lineItems?: InvoiceLineItem[];
  currency?: string;
  description?: string;
  notes?: string;
  status?: string;
  // Commercial header fields
  deliveryNote?: string;
  suppliersRef?: string;
  otherReference?: string;
  buyerOrderNo?: string;
  buyerOrderDate?: string;
  despatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  supplyDate?: string;
  discountAmount?: number;
  invoiceNumber?: string;
  displayOptions?: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class SalesInvoicesService {
  constructor(private readonly api: ApiService) {}

  listInvoices(filters?: {
    status?: string;
    paymentStatus?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<SalesInvoice[]> {
    return this.api.get<SalesInvoice[]>('/sales-invoices', filters || {});
  }

  getInvoice(id: string): Observable<SalesInvoice> {
    return this.api.get<SalesInvoice>(`/sales-invoices/${id}`);
  }

  createInvoice(payload: CreateSalesInvoicePayload): Observable<SalesInvoice> {
    return this.api.post<SalesInvoice>('/sales-invoices', payload);
  }

  updateInvoice(id: string, payload: Partial<CreateSalesInvoicePayload>): Observable<SalesInvoice> {
    return this.api.patch<SalesInvoice>(`/sales-invoices/${id}`, payload);
  }

  deleteInvoice(id: string): Observable<void> {
    return this.api.delete<void>(`/sales-invoices/${id}`);
  }

  getNextInvoiceNumber(type?: 'invoice' | 'proforma' | 'quotation'): Observable<{ invoiceNumber: string }> {
    const params = type ? { type } : {};
    return this.api.get<{ invoiceNumber: string }>('/sales-invoices/next-invoice-number', params);
  }

  listAllPayments(paymentMethod?: string): Observable<InvoicePayment[]> {
    const params = paymentMethod ? { paymentMethod } : {};
    return this.api.get<InvoicePayment[]>('/sales-invoices/payments', params);
  }

  recordPayment(invoiceId: string, payment: {
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
  }): Observable<any> {
    return this.api.post(`/sales-invoices/${invoiceId}/payments`, payment);
  }

  sendInvoiceEmail(invoiceId: string, emailData: {
    recipientEmail: string;
    subject?: string;
    message?: string;
  }): Observable<any> {
    return this.api.post(`/sales-invoices/${invoiceId}/send-email`, emailData);
  }

  getInvoicePreview(invoiceId: string): Observable<any> {
    return this.api.get<any>(`/sales-invoices/${invoiceId}/preview`);
  }

  downloadInvoicePDF(invoiceId: string): Observable<Blob> {
    return this.api.download(`/sales-invoices/${invoiceId}/pdf`);
  }

  /** Filename prefix for PDF/download by document type (quotation-, proforma-invoice-, invoice-). */
  getPdfFilenamePrefix(status?: string): string {
    if (!status) return 'invoice-';
    if (status === 'quotation' || status === 'quotation_converted_to_proforma') return 'quotation-';
    if (status === 'proforma_invoice' || status === 'proforma_converted_to_invoice') return 'proforma-invoice-';
    return 'invoice-';
  }

  /** Export invoice as XML (UBL) or JSON for UAE e-invoicing */
  exportEInvoice(
    invoiceId: string,
    format: 'xml' | 'json',
  ): Observable<Blob> {
    return this.api.download(
      `/sales-invoices/${invoiceId}/export?format=${format}`,
    );
  }

  getItemSuggestions(searchTerm?: string): Observable<Array<{
    itemName: string;
    description?: string;
    unitPrice: number;
    vatRate: number;
    vatTaxType: string;
    unitOfMeasure?: string;
    usageCount: number;
  }>> {
    const params = searchTerm ? { search: searchTerm } : {};
    return this.api.get<Array<{
      itemName: string;
      description?: string;
      unitPrice: number;
      vatRate: number;
      vatTaxType: string;
      unitOfMeasure?: string;
      usageCount: number;
    }>>('/sales-invoices/item-suggestions', params);
  }

  /** Convert quotation to proforma invoice (creates new proforma, marks quotation as converted) */
  convertQuotationToProforma(id: string): Observable<SalesInvoice> {
    return this.api.post<SalesInvoice>(`/sales-invoices/${id}/convert-to-proforma`, {});
  }

  convertProformaToInvoice(id: string): Observable<SalesInvoice> {
    return this.api.post<SalesInvoice>(`/sales-invoices/${id}/convert`, {});
  }

  updateInvoiceStatus(id: string, status: string): Observable<SalesInvoice> {
    return this.api.patch<SalesInvoice>(`/sales-invoices/${id}/status`, {
      status,
    });
  }
}

