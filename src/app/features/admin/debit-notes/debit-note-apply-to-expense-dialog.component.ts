import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DebitNotesService, DebitNote } from '../../../core/services/debit-notes.service';
import { ExpensesService } from '../../../core/services/expenses.service';
import { Expense } from '../../../core/models/expense.model';

@Component({
  selector: 'app-debit-note-apply-to-expense-dialog',
  templateUrl: './debit-note-apply-to-expense-dialog.component.html',
  styleUrls: ['./debit-note-apply-to-expense-dialog.component.scss'],
})
export class DebitNoteApplyToExpenseDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  debitNote: DebitNote;
  expenses: Expense[] = [];
  loadingExpenses = false;
  maxApplyAmount = 0;
  selectedExpense: Expense | null = null;
  expenseOutstandingAmount = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<DebitNoteApplyToExpenseDialogComponent>,
    private readonly debitNotesService: DebitNotesService,
    private readonly expensesService: ExpensesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { debitNote: DebitNote },
  ) {
    this.debitNote = data.debitNote;
    const totalAmount = parseFloat(this.debitNote.totalAmount || '0');
    const appliedAmount = parseFloat(this.debitNote.appliedAmount || '0');
    this.maxApplyAmount = Math.max(0, totalAmount - appliedAmount);

    this.form = this.fb.group({
      expenseId: ['', Validators.required],
      applyAmount: [
        this.maxApplyAmount,
        [Validators.required, Validators.min(0.01), Validators.max(this.maxApplyAmount)],
      ],
    });
  }

  ngOnInit(): void {
    this.loadExpenses();
    
    // Watch for expense changes
    this.form.get('expenseId')?.valueChanges.subscribe((expenseId) => {
      if (expenseId) {
        this.onExpenseChange(expenseId);
      }
    });
  }

  loadExpenses(): void {
    this.loadingExpenses = true;
    // Prefer expenses for the same vendor as this debit note (if known)
    const vendorId =
      this.debitNote.expense?.vendorId ||
      this.debitNote.vendorId ||
      this.debitNote.vendor?.id ||
      null;

    const filters: {
      vendorId?: string;
    } = {};

    if (vendorId) {
      filters.vendorId = vendorId;
    }

    // Fetch expenses (optionally scoped to this vendor)
    this.expensesService.listExpenses(filters).subscribe({
      next: (expenses) => {
        this.loadingExpenses = false;
        this.expenses = expenses;

        // Pre-select the linked expense if this debit note already has one
        const preselectExpenseId =
          this.debitNote.expenseId || this.debitNote.expense?.id || null;
        if (preselectExpenseId) {
          const exists = this.expenses.some((exp) => exp.id === preselectExpenseId);
          if (exists) {
            this.form.patchValue({ expenseId: preselectExpenseId });
            this.onExpenseChange(preselectExpenseId);
          }
        }
      },
      error: () => {
        this.loadingExpenses = false;
      },
    });
  }

  onExpenseChange(expenseId: string): void {
    const expense = this.expenses.find((exp) => exp.id === expenseId);
    if (expense) {
      this.selectedExpense = expense;
      
      // Calculate outstanding amount for the expense
      // Outstanding = totalAmount - paidAmount (we'll need to fetch payments or calculate)
      // For now, use totalAmount as outstanding (backend will validate)
      const totalAmount = expense.totalAmount || 0;
      this.expenseOutstandingAmount = totalAmount;

      // Set apply amount to minimum of remaining debit note amount or expense outstanding
      const suggestedAmount = Math.min(this.maxApplyAmount, this.expenseOutstandingAmount);
      this.form.patchValue({
        applyAmount: suggestedAmount,
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    this.debitNotesService.applyDebitNoteToExpense(
      this.debitNote.id,
      formValue.expenseId,
      parseFloat(formValue.applyAmount),
    ).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Debit note applied to expense successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(
          error?.error?.message || 'Failed to apply debit note to expense',
          'Close',
          { duration: 4000, panelClass: ['snack-error'] },
        );
      },
    });
  }

  getExpenseOutstanding(expense: Expense): number {
    // Outstanding balance calculation would ideally come from backend
    // For now, return totalAmount (backend will validate the actual outstanding)
    return expense.totalAmount || 0;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
