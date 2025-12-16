import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService } from '../../../core/services/expenses.service';
import { ExpensePaymentsService } from '../../../core/services/expense-payments.service';
import { SalesInvoicesService } from '../../../core/services/sales-invoices.service';

@Component({
  selector: 'app-bank-transaction-form-dialog',
  templateUrl: './bank-transaction-form-dialog.component.html',
  styleUrls: ['./bank-transaction-form-dialog.component.scss'],
})
export class BankTransactionFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  readonly transactionTypes = [
    { value: 'expense', label: 'Expense Payment' },
    { value: 'sales', label: 'Sales Receipt' },
  ];

  readonly currencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<BankTransactionFormDialogComponent>,
    private readonly expensesService: ExpensesService,
    private readonly paymentsService: ExpensePaymentsService,
    private readonly invoicesService: SalesInvoicesService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      type: ['expense', Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      description: ['', Validators.required],
      vendorOrCustomer: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['AED', Validators.required],
      referenceNumber: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {}

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    if (formValue.type === 'expense') {
      // Create expense and then add bank payment
      this.createExpenseWithBankPayment(formValue);
    } else {
      // Create sales invoice with bank received
      this.createSalesInvoiceWithBankReceived(formValue);
    }
  }

  private createExpenseWithBankPayment(data: any): void {
    // First create the expense
    this.expensesService
      .createExpense({
        type: 'expense',
        amount: data.amount,
        vatAmount: 0,
        expenseDate: data.date,
        vendorName: data.vendorOrCustomer,
        description: data.description,
        currency: data.currency,
        purchaseStatus: 'Purchase - Accruals', // Will be settled by the payment
      })
      .subscribe({
        next: (expense) => {
          // Then create the bank payment
          this.paymentsService
            .createPayment({
              expenseId: expense.id,
              amount: data.amount,
              paymentDate: data.date,
              paymentMethod: 'bank_transfer',
              referenceNumber: data.referenceNumber || undefined,
              notes: data.notes || undefined,
            })
            .subscribe({
              next: () => {
                this.loading = false;
                this.snackBar.open('Bank transaction recorded successfully', 'Close', {
                  duration: 3000,
                });
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.loading = false;
                this.snackBar.open(
                  error?.error?.message || 'Failed to record bank payment',
                  'Close',
                  { duration: 4000, panelClass: ['snack-error'] },
                );
              },
            });
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to create expense',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  private createSalesInvoiceWithBankReceived(data: any): void {
    // Create a sales invoice with bank received status
    // Note: Since tax_invoice_bank_received is removed, we'll create it as a regular invoice
    // and track it separately, or we can create it with a note
    this.invoicesService
      .createInvoice({
        customerName: data.vendorOrCustomer,
        invoiceDate: data.date,
        currency: data.currency,
        description: data.description,
        notes: data.notes || `Bank Transfer - Ref: ${data.referenceNumber || 'N/A'}`,
        status: 'tax_invoice_receivable', // Use receivable status, will be marked as bank received via payment
        lineItems: [
          {
            itemName: data.description,
            quantity: 1,
            unitPrice: data.amount,
            amount: data.amount,
            vatAmount: 0,
            totalAmount: data.amount,
            vatRate: 0,
            vatTaxType: 'STANDARD',
          },
        ],
      })
      .subscribe({
        next: (invoice) => {
          // Record payment for the invoice
          this.invoicesService
            .recordPayment(invoice.id, {
              amount: data.amount,
              paymentDate: data.date,
              paymentMethod: 'bank_transfer',
              referenceNumber: data.referenceNumber || undefined,
              notes: data.notes || undefined,
            })
            .subscribe({
              next: () => {
                this.loading = false;
                this.snackBar.open('Bank transaction recorded successfully', 'Close', {
                  duration: 3000,
                });
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.loading = false;
                this.snackBar.open(
                  error?.error?.message || 'Failed to record payment',
                  'Close',
                  { duration: 4000, panelClass: ['snack-error'] },
                );
              },
            });
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error?.error?.message || 'Failed to create invoice',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

