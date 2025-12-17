import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { InvoicePaymentDialogComponent } from './invoice-payment-dialog.component';
import { InvoiceEmailDialogComponent } from './invoice-email-dialog.component';

@Component({
  selector: 'app-invoice-detail-dialog',
  templateUrl: './invoice-detail-dialog.component.html',
  styleUrls: ['./invoice-detail-dialog.component.scss'],
})
export class InvoiceDetailDialogComponent implements OnInit {
  invoice: SalesInvoice | null = null;
  loading = false;
  outstandingAmount = 0;

  constructor(
    private readonly dialogRef: MatDialogRef<InvoiceDetailDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    @Inject(MAT_DIALOG_DATA) public data: { invoiceId: string },
  ) {}

  ngOnInit(): void {
    this.loadInvoice();
  }

  loadInvoice(): void {
    this.loading = true;
    this.invoicesService.getInvoice(this.data.invoiceId).subscribe({
      next: (invoice) => {
        this.loading = false;
        this.invoice = invoice;
        this.calculateOutstanding();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  calculateOutstanding(): void {
    if (!this.invoice) return;
    const totalAmount = parseFloat(this.invoice.totalAmount || '0');
    const paidAmount = parseFloat(this.invoice.paidAmount || '0');
    this.outstandingAmount = Math.max(0, totalAmount - paidAmount);
  }

  getPaidAmount(): number {
    if (!this.invoice) return 0;
    return parseFloat(this.invoice.paidAmount || '0');
  }

  readonly statusDisplayMap: Record<string, string> = {
    'proforma_invoice': 'Performa Invoice',
    'tax_invoice_receivable': 'Tax Invoice - Receivable',
    'tax_invoice_bank_received': 'Tax Invoice - Bank Received',
    'tax_invoice_cash_received': 'Tax Invoice - Cash received',
    // Legacy statuses for backward compatibility
    'draft': 'Draft',
    'sent': 'Sent',
    'paid': 'Paid',
    'cancelled': 'Cancelled',
    'overdue': 'Overdue',
  };

  getStatusDisplayLabel(status: string): string {
    return this.statusDisplayMap[status?.toLowerCase()] || status || 'Unknown';
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status?.toLowerCase()) {
      case 'tax_invoice_bank_received':
      case 'tax_invoice_cash_received':
      case 'paid':
      case 'sent':
        return 'primary';
      case 'proforma_invoice':
      case 'tax_invoice_receivable':
      case 'draft':
        return 'accent';
      case 'cancelled':
      case 'overdue':
        return 'warn';
      default:
        return 'accent';
    }
  }

  getPaymentStatusColor(paymentStatus: string): 'primary' | 'accent' | 'warn' {
    switch (paymentStatus?.toLowerCase()) {
      case 'paid':
        return 'primary';
      case 'partial':
        return 'accent';
      case 'unpaid':
        return 'warn';
      default:
        return 'accent';
    }
  }

  openPaymentDialog(): void {
    if (!this.invoice) return;

    const dialogRef = this.dialog.open(InvoicePaymentDialogComponent, {
      width: '500px',
      data: { invoice: this.invoice },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadInvoice(); // Reload invoice to get updated payment status
      }
    });
  }

  sendInvoiceEmail(): void {
    if (!this.invoice) return;

    const dialogRef = this.dialog.open(InvoiceEmailDialogComponent, {
      width: '600px',
      data: { invoice: this.invoice },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Email sent successfully
        this.loadInvoice(); // Reload to get updated status if needed
      }
    });
  }

  printInvoice(): void {
    window.print();
  }

  downloadPDF(): void {
    if (!this.invoice) return;

    this.loading = true;
    this.invoicesService.downloadInvoicePDF(this.invoice.id).subscribe({
      next: (blob) => {
        this.loading = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${this.invoice?.invoiceNumber || 'invoice'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  previewInvoice(): void {
    if (!this.invoice) return;
    this.dialogRef.close();
    this.router.navigate(['/admin/sales-invoices', this.invoice.id, 'preview']);
  }

  close(): void {
    this.dialogRef.close();
  }
}
