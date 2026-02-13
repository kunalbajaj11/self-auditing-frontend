import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { InvoiceFormDialogComponent } from '../sales-invoices/invoice-form-dialog.component';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';

@Component({
  selector: 'app-admin-proforma-invoices',
  templateUrl: './admin-proforma-invoices.component.html',
  styleUrls: ['./admin-proforma-invoices.component.scss'],
})
export class AdminProformaInvoicesComponent implements OnInit {
  readonly columns = [
    'invoiceNumber',
    'customerName',
    'invoiceDate',
    'dueDate',
    'totalAmount',
    'status',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<SalesInvoice>([]);
  loading = false;
  convertingId: string | null = null;

  constructor(
    private readonly invoicesService: SalesInvoicesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProformaInvoices();
  }

  loadProformaInvoices(): void {
    this.loading = true;
    const filters: any = {
      status: 'proforma_invoice', // Filter for proforma invoices only
    };

    this.invoicesService.listInvoices(filters).subscribe({
      next: (invoices) => {
        this.loading = false;
        // Backend returns proforma_invoice and proforma_converted_to_invoice for this filter
        this.dataSource.data = invoices;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load proforma invoices', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(InvoiceFormDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { documentType: 'proforma' as const },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Proforma Invoice created successfully', 'Close', {
          duration: 3000,
        });
        this.loadProformaInvoices();
      }
    });
  }

  viewInvoice(invoice: SalesInvoice): void {
    this.dialog.open(InvoiceDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { invoiceId: invoice.id },
    });
  }

  editInvoice(invoice: SalesInvoice): void {
    const dialogRef = this.dialog.open(InvoiceFormDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { ...invoice, documentType: 'proforma' as const },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Proforma Invoice updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadProformaInvoices();
      }
    });
  }

  convertToInvoice(invoice: SalesInvoice): void {
    if (!this.canConvertToInvoice(invoice)) {
      return;
    }
    if (
      !confirm(
        `Convert proforma invoice ${invoice.invoiceNumber} to tax invoice? A new tax invoice will be created and this proforma will be marked as "Converted to Invoice".`,
      )
    ) {
      return;
    }

    this.convertingId = invoice.id;
    this.cdr.detectChanges();
    this.invoicesService.convertProformaToInvoice(invoice.id).subscribe({
      next: () => {
        this.convertingId = null;
        this.cdr.detectChanges();
        this.loadProformaInvoices();
        const ref = this.snackBar.open(
          'Proforma Invoice converted to Tax Invoice successfully.',
          'View in Invoices',
          { duration: 5000 },
        );
        ref.onAction().subscribe(() => {
          this.router.navigate(['/admin/sales-invoices']);
        });
      },
      error: (error) => {
        this.convertingId = null;
        this.cdr.detectChanges();
        const msg =
          typeof error?.error?.message === 'string'
            ? error.error.message
            : error?.error?.error ?? 'Failed to convert proforma invoice to tax invoice';
        this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }

  deleteInvoice(invoice: SalesInvoice): void {
    if (
      !confirm(
        `Are you sure you want to delete proforma invoice ${invoice.invoiceNumber}?`,
      )
    ) {
      return;
    }

    this.invoicesService.deleteInvoice(invoice.id).subscribe({
      next: () => {
        this.snackBar.open('Proforma Invoice deleted successfully', 'Close', {
          duration: 3000,
        });
        this.loadProformaInvoices();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete proforma invoice',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getStatusDisplayLabel(status: string): string {
    const statusMap: Record<string, string> = {
      proforma_invoice: 'Proforma Invoice',
      proforma_converted_to_invoice: 'Converted to Invoice',
      tax_invoice_receivable: 'Tax Invoice - Receivable',
      tax_invoice_cash_received: 'Tax Invoice - Cash received',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    if (status === 'proforma_invoice') return 'primary';
    if (status === 'proforma_converted_to_invoice') return 'accent';
    if (status === 'tax_invoice_receivable') return 'accent';
    return 'primary';
  }

  /** True when proforma has a customer selected from the list (required for conversion) */
  hasCustomerFromList(invoice: SalesInvoice): boolean {
    return !!(invoice.customerId ?? invoice.customer?.id);
  }

  /** True when proforma can be converted to tax invoice (not already converted, and customer from list) */
  canConvertToInvoice(invoice: SalesInvoice): boolean {
    return invoice.status === 'proforma_invoice' && this.hasCustomerFromList(invoice);
  }
}
