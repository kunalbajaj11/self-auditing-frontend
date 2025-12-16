import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensePaymentsService, ExpensePayment } from '../../../core/services/expense-payments.service';
import { PaymentFormDialogComponent } from './payment-form-dialog.component';

@Component({
  selector: 'app-admin-payments',
  templateUrl: './admin-payments.component.html',
  styleUrls: ['./admin-payments.component.scss'],
})
export class AdminPaymentsComponent implements OnInit {
  readonly columns = [
    'expense',
    'vendor',
    'amount',
    'paymentDate',
    'paymentMethod',
    'referenceNumber',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<ExpensePayment>([]);
  loading = false;

  constructor(
    private readonly paymentsService: ExpensePaymentsService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading = true;
    this.paymentsService.listPayments().subscribe({
      next: (payments) => {
        this.dataSource.data = payments;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to load payments',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PaymentFormDialogComponent, {
      width: '600px',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPayments();
      }
    });
  }

  deletePayment(payment: ExpensePayment): void {
    if (!confirm(`Are you sure you want to delete this payment?`)) {
      return;
    }

    this.paymentsService.deletePayment(payment.id).subscribe({
      next: () => {
        this.snackBar.open('Payment deleted successfully', 'Close', {
          duration: 3000,
        });
        this.loadPayments();
      },
      error: (error) => {
        this.snackBar.open(
          error?.error?.message || 'Failed to delete payment',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }
}

