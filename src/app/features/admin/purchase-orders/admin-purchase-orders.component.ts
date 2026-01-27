import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { PurchaseOrderFormDialogComponent } from '../expenses/purchase-order-form-dialog.component';

@Component({
  selector: 'app-admin-purchase-orders',
  templateUrl: './admin-purchase-orders.component.html',
  styleUrls: ['./admin-purchase-orders.component.scss'],
})
export class AdminPurchaseOrdersComponent implements OnInit {
  readonly columns = [
    'poNumber',
    'vendor',
    'category',
    'amount',
    'date',
    'status',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<Expense>([]);
  loading = false;

  readonly filters;

  constructor(
    private readonly fb: FormBuilder,
    private readonly expensesService: ExpensesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {
    this.filters = this.fb.group({
      startDate: [''],
      endDate: [''],
      vendorName: [''],
    });
  }

  ngOnInit(): void {
    this.loadPurchaseOrders();
    this.filters.valueChanges.subscribe(() => {
      this.loadPurchaseOrders();
    });
  }

  loadPurchaseOrders(): void {
    this.loading = true;
    const rawValue = this.filters.getRawValue();
    const filters = Object.entries(rawValue)
      .filter(([, value]) => value)
      .reduce(
        (acc, [key, value]) => {
          const dateValue = value as any;
          if (dateValue && typeof dateValue === 'object' && dateValue.getTime && typeof dateValue.getTime === 'function') {
            acc[key] = new Date(dateValue).toISOString().substring(0, 10);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, any>,
      );
    
    filters['type'] = 'expense';
    this.expensesService.listExpenses(filters).subscribe({
      next: (expenses) => {
        this.loading = false;
        const sorted = expenses.sort((a, b) => {
          const dateA = new Date(a.expenseDate).getTime();
          const dateB = new Date(b.expenseDate).getTime();
          return dateB - dateA;
        });
        this.dataSource.data = sorted;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Unable to load purchase orders', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PurchaseOrderFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: null,
    });
    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.snackBar.open('Purchase Order created successfully', 'Close', { duration: 3000 });
        this.loadPurchaseOrders();
      }
    });
  }

  viewOrEditPurchaseOrder(po: Expense): void {
    const dialogRef = this.dialog.open(PurchaseOrderFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: po,
    });
    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.snackBar.open('Purchase Order updated successfully', 'Close', { duration: 3000 });
        this.loadPurchaseOrders();
      }
    });
  }

  getPONumber(po: Expense): string {
    return (po as any).poNumber || '—';
  }
}
