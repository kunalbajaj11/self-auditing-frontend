import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { QuotationFormDialogComponent } from './quotation-form-dialog.component';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';

@Component({
  selector: 'app-admin-quotations',
  templateUrl: './admin-quotations.component.html',
  styleUrls: ['./admin-quotations.component.scss'],
})
export class AdminQuotationsComponent implements OnInit {
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

  constructor(
    private readonly invoicesService: SalesInvoicesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadQuotations();
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
    const dialogRef = this.dialog.open(QuotationFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: null,
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
    const dialogRef = this.dialog.open(QuotationFormDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: invoice,
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

  convertToInvoice(invoice: SalesInvoice): void {
    if (
      !confirm(
        `Convert quotation ${invoice.invoiceNumber} to tax invoice? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.invoicesService.updateInvoiceStatus(invoice.id, 'tax_invoice_receivable').subscribe({
      next: () => {
        this.snackBar.open(
          'Quotation converted to Tax Invoice successfully',
          'Close',
          {
            duration: 3000,
          },
        );
        this.loadQuotations();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to convert quotation to invoice',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  convertToProforma(invoice: SalesInvoice): void {
    if (
      !confirm(
        `Convert quotation ${invoice.invoiceNumber} to proforma invoice? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.invoicesService.updateInvoiceStatus(invoice.id, 'proforma_invoice').subscribe({
      next: () => {
        this.snackBar.open(
          'Quotation converted to Proforma Invoice successfully',
          'Close',
          {
            duration: 3000,
          },
        );
        this.loadQuotations();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to convert quotation to proforma invoice',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
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
      proforma_invoice: 'Proforma Invoice',
      tax_invoice_receivable: 'Tax Invoice - Receivable',
      tax_invoice_cash_received: 'Tax Invoice - Cash received',
      tax_invoice_bank_received: 'Tax Invoice - Bank Received',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    if (status === 'quotation') return 'accent';
    if (status === 'proforma_invoice') return 'primary';
    if (status === 'tax_invoice_receivable') return 'accent';
    if (status === 'tax_invoice_cash_received' || status === 'tax_invoice_bank_received') {
      return 'primary';
    }
    return 'primary';
  }
}

