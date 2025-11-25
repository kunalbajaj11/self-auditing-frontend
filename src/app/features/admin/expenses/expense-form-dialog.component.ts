import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpensesService } from '../../../core/services/expenses.service';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { Expense, ExpenseType } from '../../../core/models/expense.model';

@Component({
  selector: 'app-expense-form-dialog',
  templateUrl: './expense-form-dialog.component.html',
  styleUrls: ['./expense-form-dialog.component.scss'],
})
export class ExpenseFormDialogComponent implements OnInit {
  readonly typeOptions: ExpenseType[] = [
    'expense',
    'credit',
    'adjustment',
    'advance',
    'accrual',
    'fixed_assets',
    'share_capital',
    'retained_earnings',
    'shareholder_account',
    'cost_of_sales',
  ];
  categories: Category[] = [];
  allCategories: Category[] = [];
  loading = false;

  readonly form;

  attachment?: any;
  ocrResult?: any;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ExpenseFormDialogComponent>,
    private readonly expensesService: ExpensesService,
    private readonly categoriesService: CategoriesService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) readonly data: Expense | { attachment?: any; ocrResult?: any } | null,
  ) {
    this.form = this.fb.group({
      type: ['expense' as ExpenseType, Validators.required],
      categoryId: [''],
      amount: [0, [Validators.required, Validators.min(0)]],
      vatAmount: [0, [Validators.min(0)]],
      expenseDate: [
        new Date().toISOString().substring(0, 10),
        Validators.required,
      ],
      expectedPaymentDate: [''],
      vendorName: [''],
      vendorTrn: [''],
      description: [''],
    });
  }

  ngOnInit(): void {
    // Load all categories initially
    this.categoriesService.listCategories().subscribe((categories) => {
      this.allCategories = categories;
      this.filterCategoriesByType();
    });

    // Watch for expense type changes to filter categories
    this.form.get('type')?.valueChanges.subscribe(() => {
      this.filterCategoriesByType();
      // Clear category if it's no longer valid for the selected type
      const currentCategoryId = this.form.get('categoryId')?.value;
      if (currentCategoryId) {
        setTimeout(() => {
          const currentCategory = this.categories.find(c => c.id === currentCategoryId);
          if (!currentCategory) {
            this.form.patchValue({ categoryId: '' });
          }
        }, 100);
      }
    });

    // Handle different data types
    if (this.data) {
      if ('id' in this.data) {
        // Editing existing expense
        const expense = this.data as Expense;
        this.form.patchValue({
          type: expense.type,
          categoryId: expense.categoryId ?? '',
          amount: expense.amount,
          vatAmount: expense.vatAmount,
          expenseDate: expense.expenseDate,
          expectedPaymentDate: expense.expectedPaymentDate ?? '',
          vendorName: expense.vendorName ?? '',
          vendorTrn: expense.vendorTrn ?? '',
          description: expense.description ?? '',
        });
        // Filter categories after setting the type
        setTimeout(() => this.filterCategoriesByType(), 0);
      } else {
        // New expense with attachment or OCR
        const data = this.data as { attachment?: any; ocrResult?: any };
        this.attachment = data.attachment;
        this.ocrResult = data.ocrResult;

        if (this.ocrResult) {
          // Pre-fill form with OCR data
          this.form.patchValue({
            categoryId: this.ocrResult.suggestedCategoryId || '',
            vendorName: this.ocrResult.vendorName || '',
            vendorTrn: this.ocrResult.vendorTrn || '',
            amount: this.ocrResult.amount || 0,
            vatAmount: this.ocrResult.vatAmount || 0,
            expenseDate: this.ocrResult.expenseDate || new Date().toISOString().substring(0, 10),
            description: this.ocrResult.description || '',
          });
        }
      }
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const type = (value.type as ExpenseType) ?? 'expense';
    if (type === 'accrual' && !value.expectedPaymentDate) {
      this.snackBar.open(
        'Accrual expenses require an expected payment date.',
        'Close',
        { duration: 4000, panelClass: ['snack-error'] },
      );
      return;
    }
    this.loading = true;
    
    // Prepare attachments if file was uploaded
    // Note: fileKey is not sent to backend, only used on frontend for viewing/downloading
    const attachments = this.attachment ? [{
      fileName: this.attachment.fileName,
      fileUrl: this.attachment.fileUrl,
      fileType: this.attachment.fileType,
      fileSize: this.attachment.fileSize,
    }] : undefined;

    this.expensesService
      .createExpense({
        type,
        categoryId: value.categoryId || undefined,
        amount: Number(value.amount ?? 0),
        vatAmount: Number(value.vatAmount ?? 0),
        expenseDate: value.expenseDate ?? new Date().toISOString(),
        expectedPaymentDate: value.expectedPaymentDate || undefined,
        vendorName: value.vendorName || undefined,
        vendorTrn: value.vendorTrn || undefined,
        description: value.description || undefined,
        attachments,
      } as any)
      .subscribe({
        next: (expense) => {
          this.loading = false;
          const message = this.getTransactionTypeMessage(type);
          this.snackBar.open(message, 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(expense);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open(
            'Failed to record expense. Please review the details.',
            'Close',
            { duration: 4000, panelClass: ['snack-error'] },
          );
        },
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  isEditMode(): boolean {
    return this.data !== null && this.data !== undefined && 'id' in this.data;
  }

  filterCategoriesByType(): void {
    const selectedType = this.form.get('type')?.value;
    
    if (!selectedType) {
      this.categories = this.allCategories;
      return;
    }

    // For fixed_assets and cost_of_sales, show only relevant categories
    if (selectedType === 'fixed_assets' || selectedType === 'cost_of_sales') {
      this.categoriesService.listCategories(selectedType).subscribe((filteredCategories) => {
        this.categories = filteredCategories;
        // Clear category selection if current category is not in filtered list
        const currentCategoryId = this.form.get('categoryId')?.value;
        if (currentCategoryId && !filteredCategories.find(c => c.id === currentCategoryId)) {
          this.form.patchValue({ categoryId: '' });
        }
      });
    } else {
      // For other types, show all categories (general + any specific ones)
      this.categories = this.allCategories;
    }
  }

  private getTransactionTypeMessage(type: ExpenseType): string {
    const messages: Record<ExpenseType, string> = {
      expense: 'Expense recorded successfully',
      credit: 'Sale recorded successfully',
      adjustment: 'Adjustment recorded successfully',
      advance: 'Advance recorded successfully',
      accrual: 'Accrual recorded successfully',
      fixed_assets: 'Fixed asset recorded successfully',
      share_capital: 'Share capital recorded successfully',
      retained_earnings: 'Retained earnings recorded successfully',
      shareholder_account: 'Shareholder account recorded successfully',
      cost_of_sales: 'Cost of sales recorded successfully',
    };
    return messages[type] || 'Transaction recorded successfully';
  }
}

