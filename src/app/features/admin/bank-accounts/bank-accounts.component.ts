import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { ExpensePaymentsService, ExpensePayment } from '../../../core/services/expense-payments.service';
import { JournalEntriesService, JournalEntry, JournalEntryStatus } from '../../../core/services/journal-entries.service';
import { ExpenseFormDialogComponent } from '../expenses/expense-form-dialog.component';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';
import { BankTransactionFormDialogComponent } from './bank-transaction-form-dialog.component';
import { JournalEntryFormDialogComponent } from '../journal-entries/journal-entry-form-dialog.component';

interface BankTransaction {
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
  paymentMethod?: string;
  referenceNumber?: string;
}

@Component({
  selector: 'app-bank-accounts',
  templateUrl: './bank-accounts.component.html',
  styleUrls: ['./bank-accounts.component.scss'],
})
export class BankAccountsComponent implements OnInit {
  readonly columns = [
    'date',
    'type',
    'vendorOrCustomer',
    'description',
    'amount',
    'paymentMethod',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<BankTransaction>([]);
  loading = false;

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly salesInvoicesService: SalesInvoicesService,
    private readonly expensePaymentsService: ExpensePaymentsService,
    private readonly journalEntriesService: JournalEntriesService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadBankTransactions();
  }

  loadBankTransactions(): void {
    this.loading = true;

    // Load expenses, payments, invoices, and journal entries in parallel
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
      payments: this.expensePaymentsService.listPayments().pipe(
        catchError(() => {
          this.snackBar.open('Failed to load payments', 'Close', {
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
      next: ({ expenses, payments, invoices, journalEntries }) => {
        const transactions: BankTransaction[] = [];

        // Filter payments with bank_transfer method
        const bankPayments = payments.filter(
          (payment) => payment.paymentMethod === 'bank_transfer',
        );

        // Create a map of expense IDs to their bank payments
        const expenseBankPaymentsMap = new Map<string, ExpensePayment[]>();
        bankPayments.forEach((payment) => {
          const expenseId = payment.expenseId;
          if (!expenseBankPaymentsMap.has(expenseId)) {
            expenseBankPaymentsMap.set(expenseId, []);
          }
          expenseBankPaymentsMap.get(expenseId)!.push(payment);
        });

        // Add expenses that have bank transfer payments
        expenses.forEach((expense) => {
          const bankPaymentsForExpense = expenseBankPaymentsMap.get(expense.id);
          if (bankPaymentsForExpense && bankPaymentsForExpense.length > 0) {
            // Use the most recent payment date
            const latestPayment = bankPaymentsForExpense.reduce((latest, current) => {
              return new Date(current.paymentDate) > new Date(latest.paymentDate)
                ? current
                : latest;
            });

            transactions.push({
              id: expense.id,
              type: 'expense',
              date: latestPayment.paymentDate,
              description: expense.description || 'Expense',
              vendorOrCustomer: expense.vendorName || '—',
              amount: expense.totalAmount,
              currency: expense.currency || 'AED',
              expense: expense,
              paymentMethod: latestPayment.paymentMethod,
              referenceNumber: latestPayment.referenceNumber,
            });
          }
        });

        // Filter and add journal entries with BANK_PAID or BANK_RECEIVED status
        const bankJournalEntries = journalEntries.filter(
          (entry) =>
            entry.status === JournalEntryStatus.BANK_PAID ||
            entry.status === JournalEntryStatus.BANK_RECEIVED,
        );

        bankJournalEntries.forEach((entry) => {
          transactions.push({
            id: entry.id,
            type: 'journal',
            date: entry.entryDate,
            description: entry.description || `Journal Entry - ${entry.type}`,
            vendorOrCustomer: 'Journal Entry',
            amount: parseFloat(entry.amount.toString()),
            currency: 'AED',
            journalEntry: entry,
            paymentMethod: 'Bank Transfer',
            referenceNumber: entry.referenceNumber || undefined,
          });
        });

        // Note: Sales invoices with bank received status are no longer tracked here
        // Bank transactions are now manually added via the "Add Bank Transaction" button

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

  viewExpense(transaction: BankTransaction): void {
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
        this.loadBankTransactions();
      }
    });
  }

  viewInvoice(transaction: BankTransaction): void {
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

  viewJournalEntry(transaction: BankTransaction): void {
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
        this.loadBankTransactions();
      }
    });
  }

  getPaymentMethodLabel(method?: string): string {
    if (!method) {
      return '—';
    }
    // Convert snake_case to Title Case
    return method
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  reload(): void {
    this.loadBankTransactions();
  }

  openAddTransactionDialog(): void {
    const dialogRef = this.dialog.open(BankTransactionFormDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Bank transaction added successfully', 'Close', {
          duration: 3000,
        });
        this.loadBankTransactions();
      }
    });
  }
}

