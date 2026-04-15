import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';
import { SalesInvoice } from '../../../core/services/sales-invoices.service';
import { MatDialog } from '@angular/material/dialog';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';
import { OrganizationContextService } from '../../../core/services/organization-context.service';

export interface DashboardInvoicesDialogData {
  startDate: string;
  endDate: string;
  /** Organization display currency */
  currency?: string;
}

@Component({
  selector: 'app-dashboard-invoices-dialog',
  templateUrl: './dashboard-invoices-dialog.component.html',
  styleUrls: ['./dashboard-invoices-dialog.component.scss'],
})
export class DashboardInvoicesDialogComponent implements OnInit {
  readonly orgContext = inject(OrganizationContextService);

  loading = false;
  invoices: SalesInvoice[] = [];
  displayedColumns = ['invoiceNumber', 'customerName', 'invoiceDate', 'totalAmount', 'status'];

  constructor(
    private readonly dialogRef: MatDialogRef<DashboardInvoicesDialogComponent>,
    private readonly salesInvoicesService: SalesInvoicesService,
    private readonly dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: DashboardInvoicesDialogData,
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.salesInvoicesService
      .listInvoices({
        startDate: this.data.startDate,
        endDate: this.data.endDate,
      })
      .subscribe({
        next: (list) => {
          // Show only tax invoices (exclude proforma and quotations)
          this.invoices = (list || []).filter((inv) =>
            this.salesInvoicesService.isTaxInvoice(inv.status),
          );
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number): string {
    if (amount == null) return '—';
    const code = (
      this.data.currency ||
      this.orgContext.currency()
    )
      .trim() ||
      this.orgContext.currency();
    return `${code} ${Number(amount).toFixed(2)}`;
  }

  openInvoice(invoiceId: string): void {
    this.dialog.open(InvoiceDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { invoiceId },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
