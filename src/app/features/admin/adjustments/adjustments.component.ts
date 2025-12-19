import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { JournalEntriesService, JournalEntry } from '../../../core/services/journal-entries.service';
import { ExpenseFormDialogComponent } from '../expenses/expense-form-dialog.component';
import { JournalEntryFormDialogComponent } from '../journal-entries/journal-entry-form-dialog.component';

interface AdjustmentTransaction {
  id: string;
  type: 'expense' | 'journal';
  date: string;
  description: string;
  vendorOrCustomer: string;
  amount: number;
  currency: string;
  expense?: Expense;
  journalEntry?: JournalEntry;
}

@Component({
  selector: 'app-adjustments',
  templateUrl: './adjustments.component.html',
  styleUrls: ['./adjustments.component.scss'],
})
export class AdjustmentsComponent implements OnInit {
  readonly columns = [
    'date',
    'type',
    'vendorOrCustomer',
    'description',
    'amount',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<AdjustmentTransaction>([]);
  loading = false;

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadAdjustmentTransactions();
  }

  loadAdjustmentTransactions(): void {
    this.loading = true;

    // Load expenses filtered by type='adjustment' and journal entries in parallel
    forkJoin({
      expenses: this.expensesService.listExpenses({ type: 'adjustment' }).pipe(
        catchError(() => {
          this.snackBar.open('Failed to load adjustments', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return of([]);
        }),
      ),
      journalEntries: this.journalEntriesService.listEntries({}).pipe(
        catchError(() => {
          // Silently fail for journal entries as they may not have adjustment status
          return of([]);
        }),
      ),
    }).subscribe({
      next: ({ expenses, journalEntries }) => {
        const transactions: AdjustmentTransaction[] = [];

        // Add all expenses (already filtered by backend to type='adjustment')
        expenses.forEach((expense) => {
          transactions.push({
            id: expense.id,
            type: 'expense',
            date: expense.expenseDate,
            description: expense.description || 'Adjustment',
            vendorOrCustomer: expense.vendorName || '—',
            amount: expense.totalAmount,
            currency: expense.currency || 'AED',
            expense: expense,
          });
        });

        // Note: Journal entries don't have a specific "adjustment" status
        // If needed in the future, we can add filtering logic here
        // For now, we only show expenses with type='adjustment'

        // Sort by date descending (latest first)
        transactions.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

        this.dataSource.data = transactions;
        this.loading = false;
      },
    });
  }

  viewExpense(transaction: AdjustmentTransaction): void {
    if (!transaction.expense) {
      return;
    }

    const dialogRef = this.dialog.open(ExpenseFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: transaction.expense,
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.snackBar.open('Adjustment updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadAdjustmentTransactions();
      }
    });
  }

  getTypeLabel(type: 'expense' | 'journal'): string {
    if (type === 'expense') return 'Adjustment';
    return 'Journal Entry';
  }

  getTypeColor(type: 'expense' | 'journal'): 'primary' | 'accent' | 'warn' {
    if (type === 'expense') return 'warn';
    return 'accent';
  }

  viewJournalEntry(transaction: AdjustmentTransaction): void {
    if (!transaction.journalEntry) {
      return;
    }

    const dialogRef = this.dialog.open(JournalEntryFormDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: transaction.journalEntry,
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.snackBar.open('Journal entry updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadAdjustmentTransactions();
      }
    });
  }

  reload(): void {
    this.loadAdjustmentTransactions();
  }
}

