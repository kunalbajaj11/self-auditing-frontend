import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';
import { SalesInvoicesService, SalesInvoice } from '../../../core/services/sales-invoices.service';
import { ExpensePaymentsService, ExpensePayment } from '../../../core/services/expense-payments.service';
import { JournalEntriesService, JournalEntry, JournalEntryAccount } from '../../../core/services/journal-entries.service';
import { ExpenseFormDialogComponent } from '../expenses/expense-form-dialog.component';
import { InvoiceDetailDialogComponent } from '../sales-invoices/invoice-detail-dialog.component';
import { JournalEntryFormDialogComponent } from '../journal-entries/journal-entry-form-dialog.component';

interface CashTransaction {
  id: string;
  type: 'expense' | 'sales' | 'journal' | 'payment';
  date: string;
  description: string;
  vendorOrCustomer: string;
  amount: number;
  currency: string;
  expense?: Expense;
  invoice?: SalesInvoice;
  journalEntry?: JournalEntry;
  invoicePayment?: any; // InvoicePayment
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
  dateRangeForm: FormGroup;
  openingBalance = 0;
  closingBalance = 0;
  periodTotal = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly expensesService: ExpensesService,
    private readonly salesInvoicesService: SalesInvoicesService,
    private readonly expensePaymentsService: ExpensePaymentsService,
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
      this.loadCashTransactions();
    });
  }

  ngOnInit(): void {
    this.loadCashTransactions();
  }

  loadCashTransactions(): void {
    this.loading = true;
    const formValue = this.dateRangeForm.value;
    const startDate = formValue.startDate instanceof Date 
      ? formValue.startDate.toISOString().split('T')[0] 
      : formValue.startDate;
    const endDate = formValue.endDate instanceof Date 
      ? formValue.endDate.toISOString().split('T')[0] 
      : formValue.endDate;

    // Load expenses, payments, invoices, invoice payments, and journal entries in parallel
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
      invoicePayments: this.salesInvoicesService.listAllPayments('cash').pipe(
        catchError(() => {
          this.snackBar.open('Failed to load invoice payments', 'Close', {
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
      next: ({ expenses, payments, invoices, invoicePayments, journalEntries }) => {
        const transactions: CashTransaction[] = [];
        const allTransactions: CashTransaction[] = [];

        // Filter payments with cash method
        const cashPayments = payments.filter(
          (payment) => payment.paymentMethod === 'cash',
        );

        // Create a map of expense IDs to their cash payments
        const expenseCashPaymentsMap = new Map<string, ExpensePayment[]>();
        cashPayments.forEach((payment) => {
          const expenseId = payment.expenseId;
          if (!expenseCashPaymentsMap.has(expenseId)) {
            expenseCashPaymentsMap.set(expenseId, []);
          }
          expenseCashPaymentsMap.get(expenseId)!.push(payment);
        });

        // Add expenses that have cash payments
        expenses.forEach((expense) => {
          const cashPaymentsForExpense = expenseCashPaymentsMap.get(expense.id);
          if (cashPaymentsForExpense && cashPaymentsForExpense.length > 0) {
            cashPaymentsForExpense.forEach((payment) => {
              const transaction: CashTransaction = {
                id: `${expense.id}-${payment.id}`,
                type: 'expense',
                date: payment.paymentDate,
                description: expense.description || 'Expense',
                vendorOrCustomer: expense.vendorName || '—',
                amount: parseFloat(payment.amount),
                currency: expense.currency || 'AED',
                expense: expense,
              };
              allTransactions.push(transaction);
            });
          }
        });

        // Also add expenses with purchaseStatus = 'Purchase - Cash Paid' that don't have payments yet
        // (to avoid duplicates, exclude expenses that already have cash payments)
        const cashExpenses = expenses.filter(
          (expense) =>
            expense.purchaseStatus === 'Purchase - Cash Paid' &&
            !expenseCashPaymentsMap.has(expense.id),
        );
        
        cashExpenses.forEach((expense) => {
          const transaction: CashTransaction = {
            id: expense.id,
            type: 'expense',
            date: expense.expenseDate,
            description: expense.description || 'Expense',
            vendorOrCustomer: expense.vendorName || '—',
            amount: expense.totalAmount,
            currency: expense.currency || 'AED',
            expense: expense,
          };
          allTransactions.push(transaction);
        });

        // Create a set of invoice IDs that have cash payments
        const invoicesWithCashPayments = new Set(
          invoicePayments.map((payment) => payment.invoice?.id).filter(Boolean),
        );

        // Filter and add sales invoices with tax_invoice_cash_received status
        // But exclude invoices that have individual payments shown (to avoid duplicates)
        const cashReceivedInvoices = invoices.filter(
          (invoice) =>
            invoice.status === 'tax_invoice_cash_received' &&
            !invoicesWithCashPayments.has(invoice.id),
        );

        cashReceivedInvoices.forEach((invoice) => {
          const transaction: CashTransaction = {
            id: invoice.id,
            type: 'sales',
            date: invoice.invoiceDate,
            description: invoice.description || `Invoice ${invoice.invoiceNumber}`,
            vendorOrCustomer: invoice.customerName || '—',
            amount: parseFloat(invoice.totalAmount),
            currency: invoice.currency || 'AED',
            invoice: invoice,
          };
          allTransactions.push(transaction);
        });

        // Add invoice payments with payment method = cash
        invoicePayments.forEach((payment) => {
          const invoice = payment.invoice;
          const transaction: CashTransaction = {
            id: payment.id,
            type: 'payment',
            date: payment.paymentDate,
            description: payment.notes || `Payment for Invoice ${invoice?.invoiceNumber || 'N/A'}`,
            vendorOrCustomer: invoice?.customerName || '—',
            amount: parseFloat(payment.amount),
            currency: invoice?.currency || 'AED',
            invoice: invoice,
            invoicePayment: payment,
          };
          allTransactions.push(transaction);
        });

        // Filter and add journal entries that affect Cash/Bank account
        const cashJournalEntries = journalEntries.filter(
          (entry) =>
            entry.debitAccount === JournalEntryAccount.CASH ||
            entry.creditAccount === JournalEntryAccount.CASH,
        );

        cashJournalEntries.forEach((entry) => {
          const amount = parseFloat(entry.amount.toString());
          // Debit to Cash/Bank is positive (inflow), Credit to Cash/Bank is negative (outflow)
          const transactionAmount =
            entry.debitAccount === JournalEntryAccount.CASH
              ? amount
              : -amount;

          const transaction: CashTransaction = {
            id: entry.id,
            type: 'journal',
            date: entry.entryDate,
            description:
              entry.description ||
              `Journal Entry - ${entry.debitAccount} / ${entry.creditAccount}`,
            vendorOrCustomer: entry.customerVendorName || 'Journal Entry',
            amount: transactionAmount,
            currency: 'AED',
            journalEntry: entry,
          };
          allTransactions.push(transaction);
        });

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

  getTypeLabel(type: 'expense' | 'sales' | 'journal' | 'payment'): string {
    if (type === 'expense') return 'Expense';
    if (type === 'sales') return 'Sales';
    if (type === 'payment') return 'Payment';
    return 'Journal Entry';
  }

  getTypeColor(type: 'expense' | 'sales' | 'journal' | 'payment'): 'primary' | 'accent' | 'warn' {
    if (type === 'expense') return 'warn';
    if (type === 'sales' || type === 'payment') return 'primary';
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

