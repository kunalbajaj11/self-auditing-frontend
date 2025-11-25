import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BankReconciliationService } from '../../../core/services/bank-reconciliation.service';
import { LicenseService } from '../../../core/services/license.service';
import {
  ReconciliationRecord,
  BankTransaction,
  SystemTransaction,
} from '../../../core/models/reconciliation.model';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-reconciliation-detail',
  templateUrl: './reconciliation-detail.component.html',
  styleUrls: ['./reconciliation-detail.component.scss'],
})
export class ReconciliationDetailComponent implements OnInit {
  record: ReconciliationRecord | null = null;
  loading = false;
  isEnterprise$: Observable<boolean>;

  bankColumns = ['date', 'description', 'amount', 'type', 'status', 'actions'] as const;
  systemColumns = ['date', 'description', 'amount', 'type', 'status', 'actions'] as const;

  bankDataSource = new MatTableDataSource<BankTransaction>([]);
  systemDataSource = new MatTableDataSource<SystemTransaction>([]);

  selectedBankTxn: BankTransaction | null = null;
  selectedSystemTxn: SystemTransaction | null = null;


  constructor(
    private readonly route: ActivatedRoute,
    private readonly routerInstance: Router,
    private readonly reconciliationService: BankReconciliationService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly licenseService: LicenseService,
  ) {
    this.isEnterprise$ = this.licenseService.isEnterprise().pipe(
      catchError(() => of(false)),
    );
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReconciliation(id);
    }
  }

  goBack(): void {
    this.routerInstance.navigate(['/admin/bank-reconciliation']);
  }

  loadReconciliation(id: string): void {
    this.loading = true;
    this.reconciliationService.getReconciliationDetail(id).subscribe({
      next: (record: ReconciliationRecord) => {
        this.record = record;
        this.bankDataSource.data = record.bankTransactions || [];
        this.systemDataSource.data = record.systemTransactions || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load reconciliation', 'Close', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  selectBankTransaction(txn: BankTransaction): void {
    this.selectedBankTxn = txn;
    this.selectedSystemTxn = null;
  }

  selectSystemTransaction(txn: SystemTransaction): void {
    this.selectedSystemTxn = txn;
  }

  matchTransactions(): void {
    if (!this.selectedBankTxn || !this.selectedSystemTxn) {
      this.snackBar.open('Please select both transactions to match', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.reconciliationService
      .matchTransactions({
        bankTransactionId: this.selectedBankTxn.id,
        systemTransactionId: this.selectedSystemTxn.id,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Transactions matched successfully', 'Close', {
            duration: 3000,
          });
          if (this.record) {
            this.loadReconciliation(this.record.id);
          }
          this.selectedBankTxn = null;
          this.selectedSystemTxn = null;
        },
        error: () => {
          this.snackBar.open('Failed to match transactions', 'Close', {
            duration: 3000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  downloadPDF(): void {
    if (!this.record) return;

    this.reconciliationService.downloadPDFReport(this.record.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bank-reconciliation-${this.record!.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.snackBar.open('Failed to download PDF report', 'Close', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  downloadExcel(): void {
    if (!this.record) return;

    this.reconciliationService.downloadExcelReport(this.record.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bank-reconciliation-${this.record!.id}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.snackBar.open('Failed to download Excel report', 'Close', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatCurrency(value: string): string {
    const num = parseFloat(value);
    return `AED ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'matched':
        return 'primary';
      case 'unmatched':
        return 'warn';
      case 'pending':
        return 'accent';
      default:
        return '';
    }
  }
}

