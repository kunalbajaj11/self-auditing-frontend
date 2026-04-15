import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { OrganizationContextService } from '../../../core/services/organization-context.service';

export interface DashboardExpensesDialogData {
  startDate: string;
  endDate: string;
  /** Organization display currency */
  currency?: string;
}

@Component({
  selector: 'app-dashboard-expenses-dialog',
  templateUrl: './dashboard-expenses-dialog.component.html',
  styleUrls: ['./dashboard-expenses-dialog.component.scss'],
})
export class DashboardExpensesDialogComponent implements OnInit {
  readonly orgContext = inject(OrganizationContextService);

  loading = false;
  expenses: Expense[] = [];
  displayedColumns = ['expenseDate', 'vendorName', 'categoryName', 'totalAmount', 'type'];

  constructor(
    private readonly dialogRef: MatDialogRef<DashboardExpensesDialogComponent>,
    private readonly expensesService: ExpensesService,
    @Inject(MAT_DIALOG_DATA) public data: DashboardExpensesDialogData,
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.loading = true;
    this.expensesService
      .listExpenses({
        startDate: this.data.startDate,
        endDate: this.data.endDate,
      })
      .subscribe({
        next: (list) => {
          this.expenses = list || [];
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

  close(): void {
    this.dialogRef.close();
  }
}
