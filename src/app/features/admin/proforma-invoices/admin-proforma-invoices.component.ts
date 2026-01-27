import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { ProformaInvoiceFormDialogComponent } from './proforma-invoice-form-dialog.component';
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

  readonly filters;

  constructor(
    private readonly fb: FormBuilder,
    private readonly invoicesService: SalesInvoicesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {
    this.filters = this.fb.group({
      startDate: [''],
      endDate: [''],
      customerName: [''],
    });
  }

  ngOnInit(): void {
    this.loadProformaInvoices();
    this.filters.valueChanges.subscribe(() => {
      this.loadProformaInvoices();
    });
  }

  loadProformaInvoices(): void {
    this.loading = true;
    const rawValue = this.filters.getRawValue();
    const filters: any = {
      status: 'proforma_invoice', // Filter for proforma invoices only
    };

    // Add date filters
    if (rawValue.startDate) {
      const dateValue: any = rawValue.startDate;
      if (dateValue && typeof dateValue === 'object' && 'getTime' in dateValue && typeof dateValue.getTime === 'function') {
        filters.startDate = new Date(dateValue).toISOString().substring(0, 10);
      } else if (typeof dateValue === 'string') {
        filters.startDate = dateValue;
      }
    }

    if (rawValue.endDate) {
      const dateValue: any = rawValue.endDate;
      if (dateValue && typeof dateValue === 'object' && 'getTime' in dateValue && typeof dateValue.getTime === 'function') {
        filters.endDate = new Date(dateValue).toISOString().substring(0, 10);
      } else if (typeof dateValue === 'string') {
        filters.endDate = dateValue;
      }
    }

    if (rawValue.customerName) {
      filters.customerName = rawValue.customerName;
    }

    this.invoicesService.listInvoices(filters).subscribe({
      next: (invoices) => {
        this.loading = false;
        // Filter to ensure only proforma invoices are shown
        const proformaInvoices = invoices.filter(inv => inv.status === 'proforma_invoice');
        this.dataSource.data = proformaInvoices;
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
    const dialogRef = this.dialog.open(ProformaInvoiceFormDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: null,
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
      width: '800px',
      maxWidth: '95vw',
      data: { invoiceId: invoice.id },
    });
  }

  editInvoice(invoice: SalesInvoice): void {
    const dialogRef = this.dialog.open(ProformaInvoiceFormDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: invoice,
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

  deleteInvoice(invoice: SalesInvoice): void {
    if (!confirm(`Are you sure you want to delete proforma invoice ${invoice.invoiceNumber}?`)) {
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
      'proforma_invoice': 'Proforma Invoice',
      'tax_invoice_receivable': 'Tax Invoice - Receivable',
      'tax_invoice_cash_received': 'Tax Invoice - Cash received',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    if (status === 'proforma_invoice') return 'primary';
    if (status === 'tax_invoice_receivable') return 'accent';
    return 'primary';
  }
}
