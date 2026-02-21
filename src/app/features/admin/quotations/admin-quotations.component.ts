import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { InvoiceFormDialogComponent } from '../sales-invoices/invoice-form-dialog.component';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';

@Component({
  selector: 'app-admin-quotations',
  templateUrl: './admin-quotations.component.html',
  styleUrls: ['./admin-quotations.component.scss'],
})
export class AdminQuotationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
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
    this.loadQuotations();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadQuotations(): void {
    this.loading = true;
    const filters: any = {
      status: 'quotation',
    };

    this.invoicesService.listInvoices(filters).subscribe({
      next: (invoices) => {
        this.loading = false;
        this.dataSource.data = invoices;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load quotations', 'Close', {
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
      data: { documentType: 'quotation' as const },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Quotation created successfully', 'Close', {
          duration: 3000,
        });
        this.loadQuotations();
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
      data: { ...invoice, documentType: 'quotation' as const },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Quotation updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadQuotations();
      }
    });
  }

  /** Convert Quotation → Proforma Invoice (workflow: Quotation → Proforma → Tax Invoice) */
  convertToProforma(invoice: SalesInvoice): void {
    if (!this.canConvertToProforma(invoice)) {
      return;
    }
    if (
      !confirm(
        `Convert quotation ${invoice.invoiceNumber} to proforma invoice? A new proforma will be created and this quotation will be marked as "Converted to Proforma Invoice".`,
      )
    ) {
      return;
    }

    this.convertingId = invoice.id;
    this.cdr.detectChanges();
    this.invoicesService.convertQuotationToProforma(invoice.id).subscribe({
      next: () => {
        this.convertingId = null;
        this.cdr.detectChanges();
        this.loadQuotations();
        const ref = this.snackBar.open(
          'Quotation converted to Proforma Invoice successfully.',
          'View in Proforma Invoices',
          { duration: 5000 },
        );
        ref.onAction().subscribe(() => {
          this.router.navigate(['/admin/proforma-invoices']);
        });
      },
      error: (error) => {
        this.convertingId = null;
        this.cdr.detectChanges();
        const msg =
          typeof error?.error?.message === 'string'
            ? error.error.message
            : error?.error?.error ?? 'Failed to convert quotation to proforma invoice';
        this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }

  deleteInvoice(invoice: SalesInvoice): void {
    if (
      !confirm(
        `Are you sure you want to delete quotation ${invoice.invoiceNumber}?`,
      )
    ) {
      return;
    }

    this.invoicesService.deleteInvoice(invoice.id).subscribe({
      next: () => {
        this.snackBar.open('Quotation deleted successfully', 'Close', {
          duration: 3000,
        });
        this.loadQuotations();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete quotation',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getStatusDisplayLabel(status: string): string {
    const statusMap: Record<string, string> = {
      quotation: 'Quotation',
      quotation_converted_to_proforma: 'Converted to Proforma Invoice',
      proforma_invoice: 'Proforma Invoice',
      tax_invoice_receivable: 'Tax Invoice - Receivable',
      tax_invoice_cash_received: 'Tax Invoice - Cash received',
      tax_invoice_bank_received: 'Tax Invoice - Bank Received',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    if (status === 'quotation') return 'accent';
    if (status === 'quotation_converted_to_proforma') return 'primary';
    if (status === 'proforma_invoice') return 'primary';
    if (status === 'tax_invoice_receivable') return 'accent';
    if (status === 'tax_invoice_cash_received' || status === 'tax_invoice_bank_received') {
      return 'primary';
    }
    return 'primary';
  }

  /** True when quotation has a customer selected from the list (required for conversion) */
  hasCustomerFromList(invoice: SalesInvoice): boolean {
    return !!(invoice.customerId ?? invoice.customer?.id);
  }

  /** True when quotation can be converted to proforma (not already converted, and customer from list) */
  canConvertToProforma(invoice: SalesInvoice): boolean {
    return invoice.status === 'quotation' && this.hasCustomerFromList(invoice);
  }
}

