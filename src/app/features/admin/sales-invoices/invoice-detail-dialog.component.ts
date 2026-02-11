import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  loadError: string | null = null;
  outstandingAmount = 0;

  constructor(
    private readonly dialogRef: MatDialogRef<InvoiceDetailDialogComponent>,
    private readonly invoicesService: SalesInvoicesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    @Inject(MAT_DIALOG_DATA) public data: { invoiceId: string },
  ) {}

  ngOnInit(): void {
    this.loadInvoice();
  }

  loadInvoice(): void {
    this.loading = true;
    this.loadError = null;
    this.invoicesService.getInvoice(this.data.invoiceId).subscribe({
      next: (invoice) => {
        this.loading = false;
        this.invoice = invoice;
        this.calculateOutstanding();
      },
      error: (err) => {
        this.loading = false;
        this.loadError =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : 'Failed to load invoice. It may have been deleted.';
      },
    });
  }

  calculateOutstanding(): void {
    if (!this.invoice) return;
    const totalAmount = this.getDisplayTotalAmount();
    const paidAmount = parseFloat(this.invoice.paidAmount || '0');
    this.outstandingAmount = Math.max(0, totalAmount - paidAmount);
  }

  getPaidAmount(): number {
    if (!this.invoice) return 0;
    return parseFloat(this.invoice.paidAmount || '0');
  }

  /** Total amount (amount + VAT). Uses totalAmount from API or computes from amount + vatAmount. */
  getDisplayTotalAmount(): number {
    if (!this.invoice) return 0;
    const total = this.invoice.totalAmount;
    if (total != null && total !== '') {
      const n = parseFloat(total);
      if (!isNaN(n)) return n;
    }
    const amount = parseFloat(this.invoice.amount || '0');
    const vatAmount = parseFloat(this.invoice.vatAmount || '0');
    return amount + vatAmount;
  }

  readonly statusDisplayMap: Record<string, string> = {
    'proforma_invoice': 'Proforma Invoice',
    'quotation': 'Quotation',
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

  /** Dialog header: "Proforma Invoice Details" / "Quotation Details" / "Invoice Details" + number */
  getDialogTitle(): string {
    if (!this.invoice) return 'Invoice Details';
    const status = (this.invoice.status ?? '').toLowerCase();
    const prefix =
      status === 'proforma_invoice'
        ? 'Proforma Invoice Details'
        : status === 'quotation'
          ? 'Quotation Details'
          : 'Invoice Details';
    return `${prefix} - ${this.invoice.invoiceNumber}`;
  }

  /** Label for document number by type */
  getDocumentNumberLabel(): string {
    const status = (this.invoice?.status ?? '').toLowerCase();
    if (status === 'quotation') return 'Quotation Number';
    if (status === 'proforma_invoice') return 'Proforma Invoice Number';
    return 'Invoice Number';
  }

  /** Label for document date by type */
  getDocumentDateLabel(): string {
    const status = (this.invoice?.status ?? '').toLowerCase();
    if (status === 'quotation') return 'Quotation Date';
    if (status === 'proforma_invoice') return 'Proforma Invoice Date';
    return 'Invoice Date';
  }

  /** True when document is a tax invoice (payments apply). */
  isTaxInvoice(): boolean {
    const status = (this.invoice?.status ?? '').toLowerCase();
    return (
      status === 'tax_invoice_receivable' ||
      status === 'tax_invoice_bank_received' ||
      status === 'tax_invoice_cash_received' ||
      status === 'paid' ||
      status === 'sent'
    );
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status?.toLowerCase()) {
      case 'tax_invoice_bank_received':
      case 'tax_invoice_cash_received':
      case 'paid':
      case 'sent':
        return 'primary';
      case 'quotation':
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
      width: '700px',
      maxWidth: '95vw',
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
      error: (err) => {
        this.loading = false;
        const msg =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : 'Failed to download PDF';
        this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: ['snack-error'] });
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
