import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ReportsService } from '../../../core/services/reports.service';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';

export interface AccountEntriesDialogData {
  accountName: string;
  accountType: string;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-account-entries-dialog',
  templateUrl: './account-entries-dialog.component.html',
  styleUrls: ['./account-entries-dialog.component.scss'],
})
export class AccountEntriesDialogComponent implements OnInit {
  loading = false;
  accountEntries: any = null;
  displayedColumns: string[] = [
    'date',
    'type',
    'referenceNumber',
    'description',
    'debitAmount',
    'creditAmount',
    'amount',
  ];

  constructor(
    private readonly dialogRef: MatDialogRef<AccountEntriesDialogComponent>,
    private readonly reportsService: ReportsService,
    private readonly dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: AccountEntriesDialogData,
  ) {}

  ngOnInit(): void {
    if (this.data.accountName === 'Accounts Receivable') {
      this.displayedColumns = [
        'date',
        'type',
        'referenceNumber',
        'customerName',
        'debitAmount',
        'creditAmount',
        'amount',
      ];
    }
    this.loadAccountEntries();
  }

  isAccountsReceivable(): boolean {
    return this.data.accountName === 'Accounts Receivable';
  }

  openInvoice(invoiceId: string): void {
    this.dialog.open(InvoiceDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { invoiceId },
    });
  }

  loadAccountEntries(): void {
    this.loading = true;
    this.reportsService
      .getAccountEntries({
        accountName: this.data.accountName,
        accountType: this.data.accountType,
        startDate: this.data.startDate,
        endDate: this.data.endDate,
      })
      .subscribe({
        next: (result) => {
          this.accountEntries = result;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading account entries:', error);
          this.loading = false;
        },
      });
  }

  formatCurrency(value: number, showSign: boolean = false): string {
    if (value === null || value === undefined) return '—';
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    const sign = showSign && value !== 0 ? (value >= 0 ? '+' : '-') : '';
    return `${sign}AED ${formatted}`;
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getTypeColor(type: string): 'primary' | 'accent' | 'warn' {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('debit') || typeLower.includes('payment')) {
      return 'warn';
    }
    if (typeLower.includes('credit') || typeLower.includes('invoice')) {
      return 'primary';
    }
    return 'accent';
  }

  close(): void {
    this.dialogRef.close();
  }
}
