import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { JournalEntriesService, JournalEntry, JournalEntryStatus } from '../../../core/services/journal-entries.service';
import { ExpenseFormDialogComponent } from '../expenses/expense-form-dialog.component';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';
import { JournalEntryFormDialogComponent } from '../journal-entries/journal-entry-form-dialog.component';

interface CashTransaction {
  id: string;
  type: 'expense' | 'sales' | 'journal';
  date: string;
  description: string;
  vendorOrCustomer: string;
  amount: number;
  currency: string;
  expense?: Expense;
  invoice?: SalesInvoice;
  journalEntry?: JournalEntry;
}

@Component({
  selector: 'app-cash-accounts',
  templateUrl: './cash-accounts.component.html',
  styleUrls: ['./cash-accounts.component.scss'],
})
export class CashAccountsComponent implements OnInit {
  readonly columns = [
    'date',
    'type',
    'vendorOrCustomer',
    'description',
    'amount',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<CashTransaction>([]);
  loading = false;

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly salesInvoicesService: SalesInvoicesService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadCashTransactions();
  }

  loadCashTransactions(): void {
    this.loading = true;

    // Load expenses, invoices, and journal entries in parallel
    forkJoin({
      expenses: this.expensesService.listExpenses({}).pipe(
        catchError(() => {
          this.snackBar.open('Failed to load expenses', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return of([]);
        }),
      ),
      invoices: this.salesInvoicesService.listInvoices({}).pipe(
        catchError(() => {
          this.snackBar.open('Failed to load sales invoices', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return of([]);
        }),
      ),
      journalEntries: this.journalEntriesService.listEntries({}).pipe(
        catchError(() => {
          this.snackBar.open('Failed to load journal entries', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          return of([]);
        }),
      ),
    }).subscribe({
      next: ({ expenses, invoices, journalEntries }) => {
        const transactions: CashTransaction[] = [];

        // Filter and add expenses with purchaseStatus = 'Purchase - Cash Paid'
        const cashExpenses = expenses.filter(
          (expense) => expense.purchaseStatus === 'Purchase - Cash Paid',
        );
        
        cashExpenses.forEach((expense) => {
          transactions.push({
            id: expense.id,
            type: 'expense',
            date: expense.expenseDate,
            description: expense.description || 'Expense',
            vendorOrCustomer: expense.vendorName || '—',
            amount: expense.totalAmount,
            currency: expense.currency || 'AED',
            expense: expense,
          });
        });

        // Filter and add sales invoices with tax_invoice_cash_received status
        const cashReceivedInvoices = invoices.filter(
          (invoice) => invoice.status === 'tax_invoice_cash_received',
        );

        cashReceivedInvoices.forEach((invoice) => {
          transactions.push({
            id: invoice.id,
            type: 'sales',
            date: invoice.invoiceDate,
            description: invoice.description || `Invoice ${invoice.invoiceNumber}`,
            vendorOrCustomer: invoice.customerName || '—',
            amount: parseFloat(invoice.totalAmount),
            currency: invoice.currency || 'AED',
            invoice: invoice,
          });
        });

        // Filter and add journal entries with CASH_PAID or CASH_RECEIVED status
        const cashJournalEntries = journalEntries.filter(
          (entry) =>
            entry.status === JournalEntryStatus.CASH_PAID ||
            entry.status === JournalEntryStatus.CASH_RECEIVED,
        );

        cashJournalEntries.forEach((entry) => {
          transactions.push({
            id: entry.id,
            type: 'journal',
            date: entry.entryDate,
            description: entry.description || `Journal Entry - ${entry.type}`,
            vendorOrCustomer: 'Journal Entry',
            amount: parseFloat(entry.amount.toString()),
            currency: 'AED',
            journalEntry: entry,
          });
        });

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

  viewExpense(transaction: CashTransaction): void {
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
        this.snackBar.open('Expense updated successfully', 'Close', {
          duration: 3000,
        });
        this.loadCashTransactions();
      }
    });
  }

  viewInvoice(transaction: CashTransaction): void {
    if (!transaction.invoice) {
      return;
    }

    this.dialog.open(InvoiceDetailDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { invoiceId: transaction.invoice.id },
    });
  }

  getTypeLabel(type: 'expense' | 'sales' | 'journal'): string {
    if (type === 'expense') return 'Expense';
    if (type === 'sales') return 'Sales';
    return 'Journal Entry';
  }

  getTypeColor(type: 'expense' | 'sales' | 'journal'): 'primary' | 'accent' | 'warn' {
    if (type === 'expense') return 'warn';
    if (type === 'sales') return 'primary';
    return 'accent';
  }

  viewJournalEntry(transaction: CashTransaction): void {
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
        this.loadCashTransactions();
      }
    });
  }

  reload(): void {
    this.loadCashTransactions();
  }
}

