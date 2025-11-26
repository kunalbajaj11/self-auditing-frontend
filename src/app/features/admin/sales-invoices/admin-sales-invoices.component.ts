import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { InvoiceFormDialogComponent } from './invoice-form-dialog.component';
import { InvoiceDetailDialogComponent } from './invoice-detail-dialog.component';

@Component({
  selector: 'app-admin-sales-invoices',
  templateUrl: './admin-sales-invoices.component.html',
  styleUrls: ['./admin-sales-invoices.component.scss'],
})
export class AdminSalesInvoicesComponent implements OnInit {
  readonly columns = [
    'invoiceNumber',
    'customerName',
    'invoiceDate',
    'dueDate',
    'totalAmount',
    'status',
    'paymentStatus',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<SalesInvoice>([]);
  loading = false;
  currentFilter: 'all' | 'outstanding' | 'overdue' = 'all';

  constructor(
    private readonly invoicesService: SalesInvoicesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['view'] === 'create') {
        this.openCreateDialog();
      }
      if (params['filter'] === 'outstanding') {
        this.currentFilter = 'outstanding';
      } else if (params['filter'] === 'overdue') {
        this.currentFilter = 'overdue';
      } else {
        this.currentFilter = 'all';
      }
      this.loadInvoices();
    });
  }

  loadInvoices(): void {
    this.loading = true;
    const filters: any = {};
    
    if (this.currentFilter === 'outstanding') {
      filters.paymentStatus = 'unpaid';
    } else if (this.currentFilter === 'overdue') {
      filters.paymentStatus = 'overdue';
    }

    this.invoicesService.listInvoices(filters).subscribe({
      next: (invoices) => {
        this.loading = false;
        this.dataSource.data = invoices;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load invoices', 'Close', {
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
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Invoice created successfully', 'Close', {
          duration: 3000,
        });
        this.loadInvoices();
      }
    });
  }

  editInvoice(invoice: SalesInvoice): void {
    // Load full invoice details first
    this.invoicesService.getInvoice(invoice.id).subscribe({
      next: (fullInvoice) => {
        const dialogRef = this.dialog.open(InvoiceFormDialogComponent, {
          width: '1200px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: fullInvoice,
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.snackBar.open('Invoice updated successfully', 'Close', {
              duration: 3000,
            });
            this.loadInvoices();
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to load invoice details', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
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

  deleteInvoice(invoice: SalesInvoice): void {
    if (!confirm(`Delete invoice "${invoice.invoiceNumber}"?`)) {
      return;
    }
    this.invoicesService.deleteInvoice(invoice.id).subscribe({
      next: () => {
        this.snackBar.open('Invoice deleted', 'Close', { duration: 3000 });
        this.loadInvoices();
      },
      error: () => {
        this.snackBar.open('Failed to delete invoice', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'sent':
        return 'primary';
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
      case 'overdue':
        return 'warn';
      default:
        return 'accent';
    }
  }
}

