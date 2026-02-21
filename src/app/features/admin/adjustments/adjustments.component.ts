import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
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
export class AdjustmentsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
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
  dateRangeForm: FormGroup;
  openingBalance = 0;
  closingBalance = 0;
  periodTotal = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly expensesService: ExpensesService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {
    // Initialize date range form - default to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    this.dateRangeForm = this.fb.group({
      startDate: [firstDayOfMonth],
      endDate: [lastDayOfMonth],
    });

    // Reload when date range changes
    this.dateRangeForm.valueChanges.subscribe(() => {
      this.loadAdjustmentTransactions();
    });
  }

  ngOnInit(): void {
    this.loadAdjustmentTransactions();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadAdjustmentTransactions(): void {
    this.loading = true;
    const formValue = this.dateRangeForm.value;
    const startDate = formValue.startDate instanceof Date 
      ? formValue.startDate.toISOString().split('T')[0] 
      : formValue.startDate;
    const endDate = formValue.endDate instanceof Date 
      ? formValue.endDate.toISOString().split('T')[0] 
      : formValue.endDate;

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
        const allTransactions: AdjustmentTransaction[] = [];

        // Add all expenses (already filtered by backend to type='adjustment')
        expenses.forEach((expense) => {
          const transaction: AdjustmentTransaction = {
            id: expense.id,
            type: 'expense',
            date: expense.expenseDate,
            description: expense.description || 'Adjustment',
            vendorOrCustomer: expense.vendorName || '—',
            amount: expense.totalAmount,
            currency: expense.currency || 'AED',
            expense: expense,
          };
          allTransactions.push(transaction);
        });

        // Note: Journal entries don't have a specific "adjustment" status
        // If needed in the future, we can add filtering logic here
        // For now, we only show expenses with type='adjustment'

        // Calculate opening balance (sum of all transactions before start date)
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);
        
        this.openingBalance = allTransactions
          .filter((t) => {
            const tDate = new Date(t.date);
            tDate.setHours(0, 0, 0, 0);
            return tDate < startDateObj;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        // Filter transactions for the period
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        
        transactions.push(...allTransactions.filter((t) => {
          const tDate = new Date(t.date);
          return tDate >= startDateObj && tDate <= endDateObj;
        }));

        // Calculate period total
        this.periodTotal = transactions.reduce((sum, t) => sum + t.amount, 0);

        // Calculate closing balance
        this.closingBalance = this.openingBalance + this.periodTotal;

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

