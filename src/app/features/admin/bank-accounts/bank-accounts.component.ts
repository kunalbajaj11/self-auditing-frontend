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
import { BankTransactionFormDialogComponent } from './bank-transaction-form-dialog.component';
import { JournalEntryFormDialogComponent } from '../journal-entries/journal-entry-form-dialog.component';

interface BankTransaction {
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
  paymentMethod?: string;
  referenceNumber?: string;
  invoiceNumber?: string; // Invoice number for payments/receipts
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
    'invoiceNumber',
    'description',
    'amount',
    'paymentMethod',
    'actions',
  ] as const;
  readonly dataSource = new MatTableDataSource<BankTransaction>([]);
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
      this.loadBankTransactions();
    });
  }

  ngOnInit(): void {
    this.loadBankTransactions();
  }

  loadBankTransactions(): void {
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
      invoicePayments: this.salesInvoicesService.listAllPayments('bank_transfer').pipe(
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
        const transactions: BankTransaction[] = [];
        const allTransactions: BankTransaction[] = [];

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
            bankPaymentsForExpense.forEach((payment) => {
              const transaction: BankTransaction = {
                id: `${expense.id}-${payment.id}`,
                type: 'expense',
                date: payment.paymentDate,
                description: expense.description || 'Expense',
                vendorOrCustomer: expense.vendorName || '—',
                amount: parseFloat(payment.amount),
                currency: expense.currency || 'AED',
                expense: expense,
                paymentMethod: payment.paymentMethod,
                referenceNumber: payment.referenceNumber,
                invoiceNumber: expense.invoiceNumber || '—', // Add invoice number
              };
              allTransactions.push(transaction);
            });
          }
        });

        // Filter and add journal entries that affect Cash/Bank account
        const bankJournalEntries = journalEntries.filter(
          (entry) =>
            entry.debitAccount === JournalEntryAccount.BANK ||
            entry.creditAccount === JournalEntryAccount.BANK,
        );

        bankJournalEntries.forEach((entry) => {
          const amount = parseFloat(entry.amount.toString());
          // Debit to Cash/Bank is positive (inflow), Credit to Cash/Bank is negative (outflow)
          const transactionAmount =
            entry.debitAccount === JournalEntryAccount.BANK
              ? amount
              : -amount;

          const transaction: BankTransaction = {
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
            paymentMethod: 'Bank Transfer',
            referenceNumber: entry.referenceNumber || undefined,
          };
          allTransactions.push(transaction);
        });

        // Add invoice payments with payment method = bank_transfer
        invoicePayments.forEach((payment) => {
          const invoice = payment.invoice;
          const transaction: BankTransaction = {
            id: payment.id,
            type: 'payment',
            date: payment.paymentDate,
            description: payment.notes || `Payment for Invoice ${invoice?.invoiceNumber || 'N/A'}`,
            vendorOrCustomer: invoice?.customerName || '—',
            amount: parseFloat(payment.amount),
            currency: invoice?.currency || 'AED',
            invoice: invoice,
            invoicePayment: payment,
            paymentMethod: payment.paymentMethod || 'Bank Transfer',
            referenceNumber: payment.referenceNumber || undefined,
            invoiceNumber: invoice?.invoiceNumber || '—', // Add invoice number
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

  getTypeLabel(type: 'expense' | 'sales' | 'journal' | 'payment'): string {
    if (type === 'expense') return 'Expense';
    if (type === 'sales') return 'Sales';
    if (type === 'payment') return 'Payment';
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
    const isMobile = window.innerWidth <= 768;
    const dialogRef = this.dialog.open(BankTransactionFormDialogComponent, {
      width: isMobile ? '100vw' : '600px',
      maxWidth: isMobile ? '100vw' : '95vw',
      maxHeight: isMobile ? '100vh' : '90vh',
      data: null,
      disableClose: false,
      autoFocus: false,
      panelClass: 'bank-transaction-dialog',
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

