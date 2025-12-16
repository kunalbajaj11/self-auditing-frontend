import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensePaymentsService } from '../../../core/services/expense-payments.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Expense } from '../../../core/models/expense.model';

interface ExpenseWithOutstanding extends Expense {
  outstandingAmount: number;
  totalAmount: number;
}

@Component({
  selector: 'app-payment-form-dialog',
  templateUrl: './payment-form-dialog.component.html',
  styleUrls: ['./payment-form-dialog.component.scss'],
})
export class PaymentFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  expensesWithOutstanding: ExpenseWithOutstanding[] = [];
  selectedExpense: ExpenseWithOutstanding | null = null;
  loadingExpenses = true;

  readonly paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<PaymentFormDialogComponent>,
    private readonly paymentsService: ExpensePaymentsService,
    private readonly expensesService: ExpensesService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      expenseId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      paymentDate: [new Date().toISOString().substring(0, 10), Validators.required],
      paymentMethod: ['bank_transfer'],
      referenceNumber: [''],
      notes: [''],
    });
  }

  ngOnInit(): void {
    this.loadExpensesWithOutstanding();
    
    // Watch for expense selection changes
    this.form.get('expenseId')?.valueChanges.subscribe((expenseId) => {
      this.onExpenseSelected(expenseId);
    });
  }

  loadExpensesWithOutstanding(): void {
    this.loadingExpenses = true;
    
    this.expensesService.listExpenses().subscribe({
      next: (expenses) => {
        // Load payments for all expenses in parallel
        const expenseChecks = expenses.map(expense => {
          return this.paymentsService.getPaymentsByExpense(expense.id).pipe(
            map(payments => {
              // Calculate total amount
              const totalAmount = this.calculateTotalAmount(expense);
              
              // Calculate paid amount
              const paidAmount = payments.reduce(
                (sum, p) => sum + parseFloat(p.amount || '0'),
                0,
              );
              
              const outstanding = Math.max(0, totalAmount - paidAmount);
              
              return {
                ...expense,
                totalAmount,
                outstandingAmount: outstanding,
              } as ExpenseWithOutstanding;
            })
          );
        });
        
        if (expenseChecks.length > 0) {
          forkJoin(expenseChecks).subscribe({
            next: (results) => {
              // Only include expenses with outstanding balance > 0.01
              this.expensesWithOutstanding = results.filter(
                (exp) => exp.outstandingAmount > 0.01
              );
              this.loadingExpenses = false;
            },
            error: (error) => {
              console.error('Error loading expense payments:', error);
              this.loadingExpenses = false;
              this.snackBar.open('Failed to load expenses', 'Close', {
                duration: 4000,
                panelClass: ['snack-error'],
              });
            },
          });
        } else {
          this.expensesWithOutstanding = [];
          this.loadingExpenses = false;
        }
      },
      error: (error) => {
        console.error('Failed to load expenses:', error);
        this.loadingExpenses = false;
        this.snackBar.open('Failed to load expenses', 'Close', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  calculateTotalAmount(expense: Expense): number {
    if (typeof expense.totalAmount === 'number') {
      return expense.totalAmount;
    }
    if (typeof expense.totalAmount === 'string') {
      return parseFloat(expense.totalAmount) || 0;
    }
    // Fallback: calculate from amount + vatAmount
    const amount = typeof expense.amount === 'number' 
      ? expense.amount 
      : parseFloat(String(expense.amount || '0'));
    const vatAmount = typeof expense.vatAmount === 'number' 
      ? expense.vatAmount 
      : parseFloat(String(expense.vatAmount || '0'));
    return amount + vatAmount;
  }

  onExpenseSelected(expenseId: string): void {
    if (!expenseId) {
      this.selectedExpense = null;
      this.resetAmountField();
      return;
    }

    const expense = this.expensesWithOutstanding.find((e) => e.id === expenseId);
    if (expense) {
      this.selectedExpense = expense;
      
      // Auto-fill payment amount with outstanding balance
      const amount = Math.round(expense.outstandingAmount * 100) / 100;
      this.form.get('amount')?.setValue(amount, { emitEvent: false });
      
      // Update validators
      this.form.get('amount')?.setValidators([
        Validators.required,
        Validators.min(0.01),
        this.maxAmountValidator(expense.outstandingAmount),
      ]);
      this.form.get('amount')?.updateValueAndValidity();
    } else {
      this.selectedExpense = null;
      this.resetAmountField();
    }
  }

  resetAmountField(): void {
    this.form.get('amount')?.setValue(0, { emitEvent: false });
    this.form.get('amount')?.setValidators([
      Validators.required,
      Validators.min(0.01),
    ]);
    this.form.get('amount')?.updateValueAndValidity();
  }

  clearExpenseSelection(): void {
    this.form.get('expenseId')?.setValue('', { emitEvent: false });
    this.selectedExpense = null;
    this.resetAmountField();
  }

  save(): void {
    this.form.markAllAsTouched();
    
    if (this.form.invalid) {
      this.snackBar.open('Please fix the form errors before submitting', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();
    const amount = parseFloat(formValue.amount);
    
    if (isNaN(amount) || amount <= 0) {
      this.loading = false;
      this.snackBar.open('Please enter a valid payment amount', 'Close', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.paymentsService
      .createPayment({
        expenseId: formValue.expenseId,
        amount: amount,
        paymentDate: formValue.paymentDate,
        paymentMethod: formValue.paymentMethod,
        referenceNumber: formValue.referenceNumber || undefined,
        notes: formValue.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.snackBar.open('Payment created successfully', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creating payment:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to create payment';
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  // Custom validator to handle floating point precision
  private maxAmountValidator(maxAmount: number) {
    return (control: any) => {
      if (!control.value) {
        return null;
      }
      const value = parseFloat(control.value);
      if (isNaN(value)) {
        return null;
      }
      // Use a small tolerance (0.01) for floating point comparison
      if (value > maxAmount + 0.01) {
        return { max: { max: maxAmount, actual: value } };
      }
      return null;
    };
  }
}
