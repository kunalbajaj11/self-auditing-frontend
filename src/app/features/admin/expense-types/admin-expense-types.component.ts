import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ExpenseTypesService,
  ExpenseType,
} from '../../../core/services/expense-types.service';
import { ExpenseTypeFormDialogComponent } from './expense-type-form-dialog.component';

@Component({
  selector: 'app-admin-expense-types',
  templateUrl: './admin-expense-types.component.html',
  styleUrls: ['./admin-expense-types.component.scss'],
})
export class AdminExpenseTypesComponent implements OnInit {
  readonly columns = ['name', 'displayLabel', 'description', 'type', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<ExpenseType>([]);
  loading = false;

  constructor(
    private readonly expenseTypesService: ExpenseTypesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadExpenseTypes();
  }

  openDialog(expenseType?: ExpenseType): void {
    const dialogRef = this.dialog.open(ExpenseTypeFormDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: expenseType ?? null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadExpenseTypes();
      }
    });
  }

  delete(expenseType: ExpenseType): void {
    if (!confirm(`Delete expense type "${expenseType.displayLabel || expenseType.name}"?`)) {
      return;
    }
    this.loading = true;
    this.expenseTypesService.deleteExpenseType(expenseType.id).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Expense type deleted', 'Close', { duration: 3000 });
        this.loadExpenseTypes();
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error.error?.message || 'Failed to delete expense type',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  private loadExpenseTypes(): void {
    this.loading = true;
    this.expenseTypesService.listExpenseTypes().subscribe({
      next: (expenseTypes) => {
        this.loading = false;
        this.dataSource.data = expenseTypes;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load expense types', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }
}

