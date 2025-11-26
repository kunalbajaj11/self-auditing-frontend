import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';
import { SalesInvoice } from '../../core/services/sales-invoices.service';

@Component({
  selector: 'app-public-invoice-view',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './public-invoice-view.component.html',
  styleUrls: ['./public-invoice-view.component.scss'],
})
export class PublicInvoiceViewComponent implements OnInit {
  invoice: SalesInvoice | null = null;
  loading = false;
  error: string | null = null;
  token: string | null = null;
  outstandingAmount = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.token = params['token'];
      if (this.token) {
        this.loadInvoice();
      }
    });
  }

  loadInvoice(): void {
    if (!this.token) return;

    this.loading = true;
    this.error = null;

    // Public endpoint - no auth required
    this.http.get<SalesInvoice>(`${environment.apiUrl}/sales-invoices/public/${this.token}`).subscribe({
      next: (invoice) => {
        this.loading = false;
        this.invoice = invoice;
        this.calculateOutstanding();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Invoice not found or link has expired';
      },
    });
  }

  calculateOutstanding(): void {
    if (!this.invoice) return;
    const totalAmount = parseFloat(this.invoice.totalAmount || '0');
    const paidAmount = parseFloat(this.invoice.paidAmount || '0');
    this.outstandingAmount = Math.max(0, totalAmount - paidAmount);
  }

  printInvoice(): void {
    window.print();
  }

  downloadInvoice(): void {
    // TODO: Implement PDF download
    // For now, just print
    window.print();
  }

  getPaidAmount(): number {
    if (!this.invoice) return 0;
    return parseFloat(this.invoice.paidAmount || '0');
  }

  getStatusClass(paymentStatus: string): string {
    switch (paymentStatus?.toLowerCase()) {
      case 'paid':
        return 'status-paid';
      case 'partial':
        return 'status-partial';
      case 'unpaid':
      case 'overdue':
        return 'status-unpaid';
      default:
        return '';
    }
  }
}

